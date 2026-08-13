import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { File as FileRecord } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import {
  BLOCKED_FILE_EXTENSIONS,
  categorizeMimeType,
  formatBytes,
  MAX_FILE_SIZE_BYTES,
  PREVIEW_URL_TTL_SECONDS,
  PREVIEWABLE_CATEGORIES,
  PUBLIC_DOWNLOAD_URL_TTL_SECONDS,
  USER_STORAGE_QUOTA_BYTES,
  type FileCategory,
} from "@/lib/constants";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl, getFileExtension } from "@/lib/s3";
import type { PublicFile, SerializedFile } from "@/lib/types";

export type { PublicFile, SerializedFile } from "@/lib/types";

/**
 * Maps a database row onto the public API shape.
 *
 * `s3Key` stays server-side — it is the bucket's internal address and leaking
 * it would expose our storage layout for no benefit. `shareToken` is withheld
 * unless the file is actually public, so a link cannot be guessed ahead of the
 * owner deciding to publish.
 */
export async function serializeFile(
  file: FileRecord,
): Promise<SerializedFile> {
  const category = categorizeMimeType(file.mimeType);

  return {
    id: file.id,
    filename: file.filename,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    category,
    isPublic: file.isPublic,
    shareUrl:
      file.isPublic && file.shareToken ? buildShareUrl(file.shareToken) : null,
    downloadUrl: await buildPreviewUrl(file, category),
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

/**
 * A shareable link for a public file.
 *
 * Absolute when `NEXT_PUBLIC_APP_URL` is configured; otherwise a root-relative
 * path, which the browser resolves against its own origin. Emitting a relative
 * path beats hardcoding a fallback origin: a link built from the wrong absolute
 * host is broken for whoever receives it, and nothing on the server can detect
 * that, whereas the client always knows where it is actually running.
 */
function buildShareUrl(shareToken: string): string {
  const origin = env.appUrl;
  return origin ? `${origin}/s/${shareToken}` : `/s/${shareToken}`;
}

/**
 * Presigned URL for a grid thumbnail, or `undefined` when the category has
 * nothing to show.
 *
 * Restricted to images and video on purpose. Signing every file would put a
 * read-granting URL for the user's entire library into every list response,
 * including the documents and archives the grid only ever draws an icon for.
 *
 * Signing is a local HMAC with no call to S3, so the cost is a few microseconds
 * per file rather than a round trip.
 */
async function buildPreviewUrl(
  file: FileRecord,
  category: FileCategory,
): Promise<string | undefined> {
  if (!(PREVIEWABLE_CATEGORIES as readonly string[]).includes(category)) {
    return undefined;
  }

  const { url } = await createDownloadUrl({
    key: file.s3Key,
    filename: file.filename,
    contentType: file.mimeType,
    expiresIn: PREVIEW_URL_TTL_SECONDS,
  });

  return url;
}

/** Prisma `where` fragments that select each dashboard category by MIME type. */
const CATEGORY_FILTERS: Record<
  Exclude<FileCategory, "other">,
  Prisma.FileWhereInput
> = {
  image: { mimeType: { startsWith: "image/" } },
  video: { mimeType: { startsWith: "video/" } },
  audio: { mimeType: { startsWith: "audio/" } },
  document: {
    OR: [
      { mimeType: { startsWith: "text/" } },
      { mimeType: { in: ["application/pdf", "application/json", "application/xml"] } },
      { mimeType: { contains: "word" } },
      { mimeType: { contains: "excel" } },
      { mimeType: { contains: "spreadsheet" } },
      { mimeType: { contains: "presentation" } },
      { mimeType: { contains: "powerpoint" } },
    ],
  },
  archive: {
    OR: [
      { mimeType: { contains: "zip" } },
      { mimeType: { contains: "tar" } },
      { mimeType: { contains: "rar" } },
      { mimeType: { contains: "7z" } },
      { mimeType: { contains: "gzip" } },
      { mimeType: { contains: "compressed" } },
    ],
  },
};

/**
 * Translates a dashboard category into a `where` fragment.
 *
 * `other` is defined as the complement of every named category, which keeps the
 * server-side filter in step with {@link categorizeMimeType} on the client
 * without adding a denormalised column to maintain.
 */
export function buildCategoryFilter(
  category: FileCategory,
): Prisma.FileWhereInput {
  if (category === "other") {
    return { NOT: { OR: Object.values(CATEGORY_FILTERS) } };
  }

  return CATEGORY_FILTERS[category];
}

/** Bytes the account currently occupies. */
export async function getStorageUsed(ownerId: string): Promise<number> {
  const result = await prisma.file.aggregate({
    where: { ownerId },
    _sum: { fileSize: true },
  });

  return result._sum.fileSize ?? 0;
}

/**
 * Rejects filenames whose extension is on the deny list.
 *
 * The bucket is private and downloads are always served as `attachment`, so
 * these could never execute on our side. Blocking them anyway stops the service
 * being used as a malware distribution host (OWASP: unrestricted file upload).
 */
export function assertExtensionAllowed(filename: string): void {
  const extension = getFileExtension(filename);

  if (
    extension &&
    (BLOCKED_FILE_EXTENSIONS as readonly string[]).includes(extension)
  ) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      `Files of type ".${extension}" are not allowed.`,
    );
  }
}

/** Rejects sizes outside `(0, MAX_FILE_SIZE_BYTES]`. */
export function assertSizeAllowed(fileSize: number): void {
  if (fileSize <= 0) {
    throw ApiError.badRequest("File is empty.");
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`,
    );
  }
}

/**
 * Rejects an upload that would push the account past its quota.
 *
 * Called twice: once before presigning with the size the client declares, and
 * again at confirm with the size S3 actually recorded.
 */
export async function assertQuotaAvailable(
  ownerId: string,
  additionalBytes: number,
): Promise<void> {
  const used = await getStorageUsed(ownerId);

  if (used + additionalBytes > USER_STORAGE_QUOTA_BYTES) {
    const remaining = Math.max(0, USER_STORAGE_QUOTA_BYTES - used);

    throw new ApiError(
      "QUOTA_EXCEEDED",
      `Not enough storage. ${formatBytes(remaining)} remaining of your ${formatBytes(USER_STORAGE_QUOTA_BYTES)} quota.`,
    );
  }
}

/**
 * Share-page view of a file.
 *
 * Everything identifying is withheld — no database id, no owner, no email, no
 * `s3Key`, and not even the share token itself. A visitor learns what the file
 * is and nothing about the account behind it.
 */
export async function serializePublicFile(
  file: FileRecord,
): Promise<PublicFile> {
  return {
    filename: file.filename,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    category: categorizeMimeType(file.mimeType),
    downloadUrl: await buildInlinePreviewUrl(file),
    createdAt: file.createdAt.toISOString(),
  };
}

/** Media types the share page can render inline. */
const INLINE_PREVIEW_PREFIXES = ["image/", "video/", "audio/"];

/**
 * Presigned URL for playing a shared file in the page, or `undefined` when
 * there is nothing to play.
 *
 * Restricted to media types on purpose: an archive or a PDF gets an icon and a
 * download button, so signing a URL for it would hand out read access the page
 * never uses. The TTL is the same 15 minutes as every other public link, which
 * keeps a URL scraped out of the HTML short-lived.
 */
async function buildInlinePreviewUrl(
  file: FileRecord,
): Promise<string | undefined> {
  const mimeType = file.mimeType.toLowerCase();

  if (!INLINE_PREVIEW_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
    return undefined;
  }

  const { url } = await createDownloadUrl({
    key: file.s3Key,
    filename: file.filename,
    contentType: file.mimeType,
    expiresIn: PUBLIC_DOWNLOAD_URL_TTL_SECONDS,
  });

  return url;
}

/**
 * Resolves a share token to a file that is currently public, or throws `404`.
 *
 * `isPublic` is part of the query, so a token belonging to a file that has been
 * taken private simply does not match. Unknown token, revoked token and private
 * file are indistinguishable from the outside — the response never confirms
 * that a token was ever valid.
 */
export async function findPublicFileOrThrow(
  shareToken: string,
): Promise<FileRecord> {
  const file = await prisma.file.findFirst({
    where: { shareToken, isPublic: true },
  });

  if (!file) {
    throw ApiError.notFound("This file is not available.");
  }

  return file;
}

/**
 * Loads a file the caller owns, or throws `404`.
 *
 * "Not yours" and "does not exist" deliberately produce the same response, so
 * the endpoint cannot be used to probe which ids are real.
 */
export async function findOwnedFileOrThrow(
  fileId: string,
  ownerId: string,
): Promise<FileRecord> {
  const file = await prisma.file.findFirst({ where: { id: fileId, ownerId } });

  if (!file) {
    throw ApiError.notFound("File not found.");
  }

  return file;
}
