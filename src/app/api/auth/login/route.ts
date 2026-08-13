import {
  ApiError,
  enforceRateLimit,
  jsonOk,
  parseJsonBody,
  withErrorHandling,
} from "@/lib/api";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
  verifyPasswordAgainstDummy,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

/**
 * POST /api/auth/login
 *
 * Body: `{ email, password }`
 * 200: `{ user: { id, email } }` + `Set-Cookie: sfs_session`
 * 401: wrong email or wrong password — deliberately indistinguishable
 * 429: too many attempts from this client
 */
export const POST = withErrorHandling(async (request: Request) => {
  // Tight enough to make online password guessing impractical, loose enough
  // that a person mistyping their password a few times is unaffected.
  enforceRateLimit(request, {
    scope: "auth:login",
    limit: 10,
    windowSeconds: 15 * 60,
  });

  const { email, password } = await parseJsonBody(request, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true },
  });

  // Same response and same latency whether the account exists or the password
  // is wrong, so neither can be used to enumerate registered emails.
  const passwordMatches = user
    ? await verifyPassword(password, user.password)
    : await verifyPasswordAgainstDummy(password);

  if (!user || !passwordMatches) {
    throw new ApiError("UNAUTHORIZED", "Invalid email or password.");
  }

  await setSessionCookie(
    createSessionToken({ userId: user.id, email: user.email }),
  );

  return jsonOk({ user: { id: user.id, email: user.email } });
});
