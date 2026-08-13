import { randomUUID } from "node:crypto";

import {
  jsonOk,
  parseJsonBody,
  requireSession,
  withErrorHandling,
} from "@/lib/api";
import { findOwnedFileOrThrow, serializeFile } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { visibilitySchema } from "@/lib/validation";

/**
 * PATCH /api/files/[id]/visibility
 *
 * Publishes a file or takes it private again.
 *
 * Going private **rotates the share token**, so any link already circulating is
 * dead for good. Without rotation, un-publishing would only pause a link that
 * anyone who saved it could resurrect the moment the file was published again —
 * which is not what "make this private" means to a user.
 *
 * Body: `{ isPublic }`
 * 200: `{ file }` — `shareUrl` is populated only while the file is public
 * 404: no such file, or not the caller's
 */
export const PATCH = withErrorHandling(
  async (request: Request, context: RouteContext<"/api/files/[id]/visibility">) => {
    const session = await requireSession();
    const { id } = await context.params;

    const { isPublic } = await parseJsonBody(request, visibilitySchema);

    // Establishes ownership before the write; the update is then scoped by
    // `ownerId` too, so a concurrent transfer could not slip past the check.
    await findOwnedFileOrThrow(id, session.userId);

    const [file] = await prisma.file.updateManyAndReturn({
      where: { id, ownerId: session.userId },
      data: {
        isPublic,
        ...(isPublic ? {} : { shareToken: randomUUID() }),
      },
    });

    return jsonOk({ file: await serializeFile(file) });
  },
);
