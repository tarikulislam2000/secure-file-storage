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

/**
 * Reduces a human-supplied origin to a bare `scheme://host[:port]`.
 *
 * Deployment dashboards and `.env` files are filled in by copy-paste, and
 * editors that auto-link URLs turn `https://x.com` into `[https://x.com](https://x.com)`.
 * Concatenating that with a path yields a string that looks like a link but is
 * not one — it breaks the moment a recipient taps it in a messaging app.
 *
 * Anything that does not reduce to a valid http(s) origin returns `null` so the
 * caller can fall back rather than emit a broken URL.
 */
function normalizeOrigin(raw: string | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();

  // "[label](href)" — keep the href, which is the part that was meant.
  const markdownLink = /^\[[^\]]*\]\(\s*([^)\s]+)\s*\)$/.exec(value);
  if (markdownLink) {
    value = markdownLink[1];
  }

  // "<https://example.com>" — angle brackets added by some mail/chat clients.
  value = value.replace(/^<+/, "").replace(/>+$/, "").trim();

  // Surrounding quotes that survive a careless copy out of a config file.
  value = value.replace(/^["']|["']$/g, "").trim();

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    // `origin` discards any path, query, hash and trailing slash, so callers
    // can always append "/s/…" without producing a double slash.
    return url.origin;
  } catch {
    return null;
  }
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

  /**
   * Public origin used to build share links, or `null` when it is unset or
   * unusable.
   *
   * Returns `null` rather than guessing a default: a wrong absolute origin
   * produces share links that are silently broken for the recipient, whereas
   * `null` lets the browser fall back to its own `window.location.origin`,
   * which is always correct.
   */
  get appUrl(): string | null {
    return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
} as const;
