import "server-only";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { SESSION_TTL_SECONDS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Authentication primitives: password hashing and stateless JWT sessions.
 *
 * The token is stored in an `httpOnly` cookie so JavaScript — including any
 * injected via XSS — cannot read it, and `sameSite: lax` keeps it off
 * cross-site POST requests (CSRF). Being stateless, verification costs no
 * round trip to Postgres or a session store.
 */

/** OWASP-recommended work factor; ~250 ms per hash on typical hardware. */
const BCRYPT_ROUNDS = 12;

export const SESSION_COOKIE_NAME = "sfs_session";

const JWT_ISSUER = "secure-file-storage";
const JWT_AUDIENCE = "secure-file-storage:web";

/** The verified identity attached to an authenticated request. */
export interface SessionUser {
  userId: string;
  email: string;
}

interface SessionTokenPayload extends SessionUser {
  iat: number;
  exp: number;
}

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

/** Issues a signed session token for the given user. */
export function createSessionToken(user: SessionUser): string {
  return jwt.sign({ userId: user.userId, email: user.email }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: SESSION_TTL_SECONDS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: user.userId,
  });
}

/**
 * Verifies a session token's signature, expiry, issuer and audience.
 *
 * Returns `null` for anything untrusted — expired, tampered with, signed by a
 * different secret, or issued for another audience. `algorithms` is pinned so a
 * forged `alg: none` header cannot bypass verification.
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as SessionTokenPayload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

/** Cookie attributes shared by the set and clear paths. */
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
  };
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
