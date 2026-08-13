import {
  ApiError,
  jsonOk,
  requireSession,
  withErrorHandling,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/me
 *
 * Returns the signed-in user. Used by the client to restore session state on
 * load, since the session cookie is `httpOnly` and unreadable from JavaScript.
 *
 * 200: `{ user: { id, email, createdAt } }`
 * 401: no valid session
 */
export const GET = withErrorHandling(async () => {
  const session = await requireSession();

  // Read through to the database rather than trusting the token's claims: an
  // account deleted since the token was issued must not resolve to a user.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user) {
    throw ApiError.unauthorized("This account no longer exists.");
  }

  return jsonOk({ user });
});
