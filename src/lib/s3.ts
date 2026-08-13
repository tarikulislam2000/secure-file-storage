import "server-only";

import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  DOWNLOAD_URL_TTL_SECONDS,
  MAX_FILENAME_LENGTH,
  UPLOAD_URL_TTL_SECONDS,
} from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * AWS S3 access layer.
 *
 * Binary data never flows through the application server. Clients receive
 * short-lived presigned URLs and talk to S3 directly, which keeps 100 MB
 * uploads off the serverless function's memory and request-body limits.
 *
 * The bucket has "Block Public Access" enabled — every read, public or private,
 * is authorised by our API before a presigned GET URL is minted.
 */

const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

function getClient(): S3Client {
  const client =
    globalForS3.s3Client ??
    new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      },
    });

  globalForS3.s3Client = client;
  return client;
}

/**
 * Strips everything that could be abused for path traversal or header
 * injection, leaving a safe display name.
 *
 * The result is only ever used as a *label*: the object key itself is built
 * from a server-generated UUID, so a hostile filename cannot influence where
 * the object lands in the bucket.
 */
export function sanitizeFilename(filename: string): string {
  // Drop any directory component: "../../etc/passwd" -> "passwd".
  const leaf = filename.split(/[/\\]/).pop() ?? "";

  // Remove control characters (which allow header injection in
  // Content-Disposition) and double quotes (which would close it early).
  const base = [...leaf]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127 && char !== '"';
    })
    .join("")
    .trim();

  if (!base || base === "." || base === "..") {
    return "untitled";
  }

  return base.slice(0, MAX_FILENAME_LENGTH);
}

/** Lower-cased extension without the dot, or `null` when there is none. */
export function getFileExtension(filename: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Builds the object key for a new upload.
 *
 * Namespacing by owner id keeps per-user IAM policies and lifecycle rules easy
 * to express later; the UUID guarantees uniqueness so two uploads of the same
 * filename can never collide or overwrite one another.
 */
export function buildObjectKey(ownerId: string, filename: string): string {
  const extension = getFileExtension(filename);
  return `uploads/${ownerId}/${randomUUID()}${extension ? `.${extension}` : ""}`;
}

/**
 * Presigned `PUT` URL the browser streams the file body to.
 *
 * `ContentType` is part of the signature, so the client cannot store the object
 * under a different content type than the one we recorded. The size is verified
 * authoritatively with {@link headObject} once the upload completes.
 */
export async function createUploadUrl(params: {
  key: string;
  contentType: string;
}): Promise<{ url: string; expiresIn: number }> {
  const command = new PutObjectCommand({
    Bucket: env.s3BucketName,
    Key: params.key,
    ContentType: params.contentType,
  });

  const url = await getSignedUrl(getClient(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return { url, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

/**
 * Presigned `GET` URL for an authorised download.
 *
 * The response headers are pinned at signing time: the original filename is
 * restored for the user, and `attachment` disposition stops the browser from
 * rendering an uploaded HTML/SVG file in our own origin's context.
 */
export async function createDownloadUrl(params: {
  key: string;
  filename: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ url: string; expiresIn: number }> {
  const expiresIn = params.expiresIn ?? DOWNLOAD_URL_TTL_SECONDS;
  const safeName = sanitizeFilename(params.filename);
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, "_");

  const command = new GetObjectCommand({
    Bucket: env.s3BucketName,
    Key: params.key,
    ResponseContentType: params.contentType,
    ResponseContentDisposition: [
      "attachment",
      `filename="${asciiName}"`,
      `filename*=UTF-8''${encodeURIComponent(safeName)}`,
    ].join("; "),
  });

  const url = await getSignedUrl(getClient(), command, { expiresIn });

  return { url, expiresIn };
}

/**
 * Reads the object's real metadata from S3.
 *
 * This is what makes the upload flow trustworthy: the size and content type we
 * persist come from S3 itself, not from a client-supplied JSON body.
 */
export async function headObject(key: string): Promise<{
  contentLength: number;
  contentType: string | null;
} | null> {
  try {
    const result = await getClient().send(
      new HeadObjectCommand({ Bucket: env.s3BucketName, Key: key }),
    );

    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (error instanceof NotFound) {
      return null;
    }
    throw error;
  }
}

/** Removes an object. Succeeds even when the key is already gone. */
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env.s3BucketName, Key: key }),
  );
}
