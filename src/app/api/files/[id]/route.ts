import { jsonOk, requireSession, withErrorHandling } from "@/lib/api";
import { findOwnedFileOrThrow, serializeFile } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3";

/**
 * GET /api/files/[id]
 *
 * Metadata for a single file the caller owns.
 * 404 for both "no such file" and "not yours", so ids cannot be probed.
 */
export const GET = withErrorHandling(
  async (_request: Request, context: RouteContext<"/api/files/[id]">) => {
    const session = await requireSession();
    const { id } = await context.params;

    const file = await findOwnedFileOrThrow(id, session.userId);

    return jsonOk({ file: serializeFile(file) });
  },
);

/**
 * DELETE /api/files/[id]
 *
 * Removes the object from S3 and then the row from Postgres.
 *
 * Order matters. S3 goes first: if it fails, the row survives and the user can
 * retry, which is recoverable. The reverse order would leave a paid-for object
 * in the bucket that nothing references and nobody can find. `DeleteObject` is
 * idempotent, so a retry after a partial failure is safe.
 *
 * 200: `{ success: true, id }`
 * 404: no such file, or not the caller's
 */
export const DELETE = withErrorHandling(
  async (_request: Request, context: RouteContext<"/api/files/[id]">) => {
    const session = await requireSession();
    const { id } = await context.params;

    const file = await findOwnedFileOrThrow(id, session.userId);

    await deleteObject(file.s3Key);

    // Scoped by `ownerId` as well as `id`: even at this point the query cannot
    // touch a row belonging to someone else.
    await prisma.file.deleteMany({ where: { id, ownerId: session.userId } });

    return jsonOk({ success: true, id });
  },
);
