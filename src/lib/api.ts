import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { getSession, type SessionUser } from "@/lib/auth";

/**
 * Shared REST plumbing: one error shape, one place that decides what leaks to
 * the client, and one wrapper that guarantees no handler can ever return a raw
 * stack trace.
 *
 * Every response body follows the same envelope:
 *   success -> the resource payload
 *   failure -> { error: { code, message, details? } }
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "QUOTA_EXCEEDED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  QUOTA_EXCEEDED: 507,
  INTERNAL_ERROR: 500,
};

/** An error that is safe to surface to the client verbatim. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static unauthorized(message = "Authentication required.") {
    return new ApiError("UNAUTHORIZED", message);
  }

  static notFound(message = "Resource not found.") {
    return new ApiError("NOT_FOUND", message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError("BAD_REQUEST", message, details);
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function jsonError(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    },
    { status: error.status },
  );
}

/**
 * Normalises anything thrown inside a route handler into an `ApiError`.
 *
 * Unexpected errors are logged server-side and replaced with a generic message,
 * so internals (SQL, AWS ARNs, stack traces) never reach the client.
 */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ApiError(
      "VALIDATION_ERROR",
      "The request body failed validation.",
      formatZodError(error),
    );
  }

  console.error("[api] unhandled error:", error);

  return new ApiError(
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
  );
}

/** Flattens Zod issues into `{ field: message }` for easy form binding. */
function formatZodError(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    fieldErrors[path] ??= issue.message;
  }

  return fieldErrors;
}

type RouteHandler<Args extends unknown[]> = (
  ...args: Args
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a route handler so every failure path returns the standard error
 * envelope instead of Next.js's default HTML error page.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: RouteHandler<Args>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return jsonError(toApiError(error));
    }
  };
}

/**
 * Returns the authenticated user or throws `401`.
 *
 * Route handlers re-verify the session themselves rather than trusting a header
 * set upstream — `proxy.ts` is an optimistic redirect layer, not the
 * authorisation boundary.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    throw ApiError.unauthorized();
  }

  return session;
}

/** Parses and validates a JSON request body against a Zod schema. */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON.");
  }

  return schema.parse(body);
}
