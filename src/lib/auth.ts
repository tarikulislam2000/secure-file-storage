import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { SESSION_TTL_SECONDS } from "@/lib/constants";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session";

/**
 * Server-side authentication helpers: password hashing and the request-scoped
 * session cookie. Token signing and verification live in `@/lib/session` so
 * they stay importable from `proxy.ts`.
 */

export {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
export type { SessionUser } from "@/lib/session";

/** OWASP-recommended work factor; roughly 250 ms per hash on typical hardware. */
const BCRYPT_ROUNDS = 12;

/**
 * A real bcrypt hash (cost 12) of a random 32-byte value nobody can supply.
 *
 * Login compares against this when the email is unknown, so a request for a
 * non-existent account costs the same ~250 ms as one for a real account.
 * Without it, response latency alone would reveal which emails are registered.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$7LQz7Ztn0w..1.ZUijqsWeIGwUuveqHqAiKoZJ36MKCn2yhB9hqOC";

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Constant-time comparison of a candidate password against a stored hash.
 * Returns `false` rather than throwing on a malformed hash.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch {
    return false;
  }
}

/** Burns the same amount of CPU as a real check, then always fails. */
export async function verifyPasswordAgainstDummy(
  plainPassword: string,
): Promise<false> {
  await verifyPassword(plainPassword, DUMMY_PASSWORD_HASH);
  return false;
}

/** Writes the session cookie on the outgoing response. */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Expires the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

/**
 * Resolves the current session from the request cookies.
 * Returns `null` when there is no cookie or the token does not verify.
 */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
