import { Prisma } from "@/generated/prisma/client";
import {
  ApiError,
  jsonOk,
  parseJsonBody,
  requireSession,
  withErrorHandling,
} from "@/lib/api";
import { DEFAULT_MIME_TYPE } from "@/lib/constants";
import {
  assertQuotaAvailable,
  assertSizeAllowed,
  serializeFile,
} from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/s3";
import { verifyUploadTicket } from "@/lib/upload-ticket";
import { confirmUploadSchema } from "@/lib/validation";

/**
 * POST /api/files/confirm
 *
 * Commits an upload to the database once S3 has accepted the bytes.
 *
 * Nothing here is taken on the client's word. The object key comes from a
 * signed ticket issued at presign time, and the size and content type are read
 * back from S3 with `HeadObject` — the only account of the upload that cannot
 * be fabricated. An upload that lands over the limit or over quota is deleted
 * from the bucket rather than recorded.
 *
 * Body: `{ uploadToken }`
 * 201: `{ file }`
 * 400: ticket expired or the object never arrived
 * 409: this upload was already confirmed
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireSession();

  const { uploadToken } = await parseJsonBody(request, confirmUploadSchema);

  const ticket = verifyUploadTicket(uploadToken);

  if (!ticket) {
    throw ApiError.badRequest(
      "This upload session has expired. Please upload the file again.",
    );
  }

  // Belt and braces: the ticket is signed, but a token minted for one account
  // must never be redeemable by another.
  if (ticket.ownerId !== session.userId) {
    throw ApiError.forbidden("This upload does not belong to your account.");
  }

  const object = await headObject(ticket.key);

  if (!object) {
    throw ApiError.badRequest(
      "The file was not found in storage. The upload may not have completed.",
    );
  }

  // S3 accepted the bytes, so any rejection from here on must also remove them
  // — otherwise a rejected upload still occupies (and bills for) storage.
  try {
    assertSizeAllowed(object.contentLength);
    await assertQuotaAvailable(session.userId, object.contentLength);
  } catch (error) {
    await deleteObject(ticket.key).catch((cleanupError) => {
      console.error("[confirm] failed to remove rejected upload:", cleanupError);
    });
    throw error;
  }

  try {
    const file = await prisma.file.create({
      data: {
        filename: ticket.filename,
        s3Key: ticket.key,
        fileSize: object.contentLength,
        mimeType: object.contentType ?? DEFAULT_MIME_TYPE,
        ownerId: session.userId,
      },
    });

    return jsonOk({ file: await serializeFile(file) }, 201);
  } catch (error) {
    // The unique index on `s3Key` makes confirm idempotent-safe: a retried or
    // duplicated call cannot create a second row for the same object.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError("CONFLICT", "This upload has already been confirmed.");
    }

    throw error;
  }
});
