import "server-only";

/**
 * Centralised, lazily-validated access to server environment variables.
 *
 * Values are read through getters rather than at module load so that importing
 * this module during `next build` (where a route may be statically analysed
 * without a full runtime environment) never throws. The first *use* of a
 * missing variable fails loudly with an actionable message instead.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable "${name}". Add it to .env (local) or the project settings (Vercel).`,
    );
  }

  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },

  get jwtSecret(): string {
    const secret = required("JWT_SECRET");

    if (secret.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long to provide adequate HMAC strength.",
      );
    }

    return secret;
  },

  get awsRegion(): string {
    return required("AWS_REGION");
  },

  get awsAccessKeyId(): string {
    return required("AWS_ACCESS_KEY_ID");
  },

  get awsSecretAccessKey(): string {
    return required("AWS_SECRET_ACCESS_KEY");
  },

  get s3BucketName(): string {
    return required("AWS_S3_BUCKET_NAME");
  },

  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
} as const;
