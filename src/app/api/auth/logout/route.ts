import { jsonOk, withErrorHandling } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 *
 * Expires the session cookie. Idempotent — calling it without a session is a
 * no-op that still returns 200, so the client never has to special-case it.
 *
 * Sessions are stateless JWTs, so this revokes the browser's copy of the token
 * rather than the token itself; see SYSTEM_DESIGN.md for the Redis-backed
 * revocation path if global sign-out is ever required.
 */
export const POST = withErrorHandling(async () => {
  await clearSessionCookie();
  return jsonOk({ success: true });
});
