import {
  enforceRateLimit,
  jsonOk,
  parseJsonBody,
  requireSession,
  withErrorHandling,
} from "@/lib/api";
import { DEFAULT_MIME_TYPE, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import {
  assertExtensionAllowed,
  assertQuotaAvailable,
  assertSizeAllowed,
} from "@/lib/files";
import { buildObjectKey, createUploadUrl, sanitizeFilename } from "@/lib/s3";
import { createUploadTicket } from "@/lib/upload-ticket";
import { uploadUrlSchema } from "@/lib/validation";

/**
 * POST /api/files/upload-url
 *
 * Issues a presigned S3 `PUT` URL so the browser can stream the file straight
 * to the bucket. The body never touches this server, which is what makes
 * 100 MB uploads possible on a platform with a 4.5 MB request-body limit.
 *
 * Body: `{ filename, fileSize, mimeType? }`
 * 200: `{ uploadUrl, uploadToken, key, expiresIn, maxFileSize }`
 * 413: larger than the per-file limit
 * 415: extension on the deny list
 * 507: would exceed the account's storage quota
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireSession();

  // Presigning is cheap for us but grants write access to the bucket, so cap
  // how fast one client can mint URLs.
  enforceRateLimit(request, {
    scope: "files:upload-url",
    limit: 60,
    windowSeconds: 60,
  });

  const body = await parseJsonBody(request, uploadUrlSchema);

  const filename = sanitizeFilename(body.filename);

  assertExtensionAllowed(filename);
  assertSizeAllowed(body.fileSize);
  await assertQuotaAvailable(session.userId, body.fileSize);

  // The key is built from a server-generated UUID under the owner's prefix, so
  // a hostile filename cannot steer the object anywhere unexpected.
  const key = buildObjectKey(session.userId, filename);
  const contentType = body.mimeType ?? DEFAULT_MIME_TYPE;

  const { url, expiresIn } = await createUploadUrl({ key, contentType });

  return jsonOk({
    uploadUrl: url,
    // Opaque to the client; handed back to /api/files/confirm unchanged.
    uploadToken: createUploadTicket({
      key,
      ownerId: session.userId,
      filename,
    }),
    key,
    expiresIn,
    maxFileSize: MAX_FILE_SIZE_BYTES,
  });
});
