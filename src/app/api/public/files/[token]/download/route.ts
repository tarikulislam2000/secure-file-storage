import { NextResponse } from "next/server";

import { enforceRateLimit, withErrorHandling } from "@/lib/api";
import { PUBLIC_DOWNLOAD_URL_TTL_SECONDS } from "@/lib/constants";
import { findPublicFileOrThrow } from "@/lib/files";
import { createDownloadUrl } from "@/lib/s3";

/**
 * GET /api/public/files/[token]/download
 *
 * Redirects straight to a freshly signed S3 URL.
 *
 * The sibling JSON endpoint serves the share *page*; this one exists so a share
 * link also works everywhere a plain URL is expected — an `<a download>`, a
 * paste into a chat client, `curl -L`. Authorisation is identical; only the
 * response shape differs.
 *
 * 302: `Location` header pointing at the presigned URL
 * 404: unknown token, or a file that is no longer public
 */
export const GET = withErrorHandling(
  async (
    request: Request,
    context: RouteContext<"/api/public/files/[token]/download">,
  ) => {
    enforceRateLimit(request, {
      scope: "public:download",
      limit: 30,
      windowSeconds: 60,
    });

    const { token } = await context.params;

    const file = await findPublicFileOrThrow(token);

    const { url } = await createDownloadUrl({
      key: file.s3Key,
      filename: file.filename,
      contentType: file.mimeType,
      expiresIn: PUBLIC_DOWNLOAD_URL_TTL_SECONDS,
    });

    // 302, not 301: the target is signed and short-lived, so the browser must
    // come back through us — and through the ownership check — next time.
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, no-store");

    return response;
  },
);
