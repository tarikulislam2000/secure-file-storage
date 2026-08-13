import { Prisma } from "@/generated/prisma/client";
import {
  ApiError,
  enforceRateLimit,
  jsonOk,
  parseJsonBody,
  withErrorHandling,
} from "@/lib/api";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

/**
 * POST /api/auth/register
 *
 * Creates an account and signs the user straight in.
 *
 * Body: `{ email, password }`
 * 201: `{ user: { id, email, createdAt } }` + `Set-Cookie: sfs_session`
 * 409: the email is already registered
 * 422: the payload failed validation
 */
export const POST = withErrorHandling(async (request: Request) => {
  enforceRateLimit(request, {
    scope: "auth:register",
    limit: 5,
    windowSeconds: 15 * 60,
  });

  const { email, password } = await parseJsonBody(request, registerSchema);

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { email, password: passwordHash },
      // Never select `password` — it must not be able to leak into a response.
      select: { id: true, email: true, createdAt: true },
    });

    await setSessionCookie(
      createSessionToken({ userId: user.id, email: user.email }),
    );

    return jsonOk({ user }, 201);
  } catch (error) {
    // Let the unique index be the source of truth rather than a read-then-write,
    // which would race two concurrent sign-ups for the same address.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        "CONFLICT",
        "An account with this email already exists.",
      );
    }

    throw error;
  }
});
