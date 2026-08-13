import { enforceRateLimit, jsonOk, withErrorHandling } from "@/lib/api";
import { PUBLIC_DOWNLOAD_URL_TTL_SECONDS } from "@/lib/constants";
import { findPublicFileOrThrow, serializePublicFile } from "@/lib/files";
import { createDownloadUrl } from "@/lib/s3";

/**
 * GET /api/public/files/[token]
 *
 * The unauthenticated half of sharing: resolves a share token to file details
 * plus a short-lived download URL, with no session required.
 *
 * The token is a random UUID held separately from the row's primary key, so a
 * share link reveals nothing about the id space and sequential probing finds
 * nothing. The S3 bucket itself stays private throughout — this endpoint mints
 * a time-limited presigned GET rather than the bucket being world-readable,
 * which keeps hotlinking and scraped-URL egress bounded.
 *
 * 200: `{ file, download: { url, expiresIn } }`
 * 404: unknown token, or a file that is no longer public
 * 429: too many lookups from one client
 */
export const GET = withErrorHandling(
  async (
    request: Request,
    context: RouteContext<"/api/public/files/[token]">,
  ) => {
    // The only endpoint reachable without a session, so it is the one most
    // exposed to scraping. UUIDv4 tokens are not brute-forceable, but this also
    // caps how fast one client can turn links into S3 bandwidth.
    enforceRateLimit(request, {
      scope: "public:file",
      limit: 60,
      windowSeconds: 60,
    });

    const { token } = await context.params;

    const file = await findPublicFileOrThrow(token);

    const { url, expiresIn } = await createDownloadUrl({
      key: file.s3Key,
      filename: file.filename,
      contentType: file.mimeType,
      expiresIn: PUBLIC_DOWNLOAD_URL_TTL_SECONDS,
    });

    const response = jsonOk({
      file: await serializePublicFile(file),
      download: { url, expiresIn },
    });

    // The body carries a signed URL, so no shared cache may keep a copy — it
    // would outlive the owner's ability to revoke the link.
    response.headers.set("Cache-Control", "private, no-store");

    return response;
  },
);
