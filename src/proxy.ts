import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

/**
 * Route guard.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; it now runs on the
 * Node.js runtime, so the session JWT can be verified here rather than merely
 * sniffed for presence.
 *
 * This layer only decides *where to send the browser*. It is not the
 * authorisation boundary: every route handler independently calls
 * `requireSession()` and every file query is scoped by `ownerId`, so a request
 * that somehow bypasses the proxy still cannot read another user's data.
 */

/** Signed-in users are bounced away from these. */
const GUEST_ONLY_ROUTES = ["/login", "/register"];

/** Signed-out users are bounced away from these. */
const PROTECTED_ROUTES = ["/dashboard"];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (matches(pathname, PROTECTED_ROUTES) && !session) {
    // Preserve the destination so the user lands where they meant to go.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(loginUrl);

    // The cookie was present but did not verify (expired or tampered with).
    // Drop it so the browser stops replaying a token that can never work.
    if (token) {
      response.cookies.set(SESSION_COOKIE_NAME, "", {
        ...sessionCookieOptions(),
        maxAge: 0,
      });
    }

    return response;
  }

  if (matches(pathname, GUEST_ONLY_ROUTES) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // API routes are excluded on purpose: they authenticate themselves and must
  // answer with a JSON 401 that `fetch` can handle, never with an HTML redirect.
  // Public share links (/s/...) are excluded because they require no session.
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
