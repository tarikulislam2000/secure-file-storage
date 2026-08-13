import jwt from "jsonwebtoken";

import { SESSION_TTL_SECONDS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Stateless session tokens.
 *
 * Deliberately free of `next/headers` and any request-scoped API so this module
 * can be imported from both route handlers and `proxy.ts`, which run in
 * different execution contexts.
 *
 * The token lives in an `httpOnly` cookie: JavaScript — including anything
 * injected via XSS — cannot read it, and `sameSite: lax` keeps it off
 * cross-site POST requests (CSRF).
 */

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
 * Verifies a token's signature, expiry, issuer and audience.
 *
 * Returns `null` for anything untrusted — expired, tampered with, signed with a
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
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
  };
}
