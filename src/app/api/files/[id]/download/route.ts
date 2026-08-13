import { jsonOk, requireSession, withErrorHandling } from "@/lib/api";
import { findOwnedFileOrThrow } from "@/lib/files";
import { createDownloadUrl } from "@/lib/s3";

/**
 * GET /api/files/[id]/download
 *
 * Mints a short-lived presigned S3 `GET` URL for a file the caller owns.
 *
 * The bucket stays fully private — "Block Public Access" is on — so this
 * endpoint is the only way to read an object, and it authorises before signing.
 * The URL is time-limited, meaning a link that leaks later is already dead.
 *
 * 200: `{ url, expiresIn, filename, fileSize, mimeType }`
 * 404: no such file, or not the caller's
 */
export const GET = withErrorHandling(
  async (_request: Request, context: RouteContext<"/api/files/[id]/download">) => {
    const session = await requireSession();
    const { id } = await context.params;

    const file = await findOwnedFileOrThrow(id, session.userId);

    const { url, expiresIn } = await createDownloadUrl({
      key: file.s3Key,
      filename: file.filename,
      contentType: file.mimeType,
    });

    return jsonOk({
      url,
      expiresIn,
      filename: file.filename,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    });
  },
);
