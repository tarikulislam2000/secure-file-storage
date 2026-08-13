import "server-only";

/**
 * Fixed-window rate limiter, in process memory.
 *
 * Scope note: state lives in a single serverless instance, so with several warm
 * instances the effective limit is `limit x instances`. That is enough to blunt
 * credential stuffing and presign-URL abuse from a single client, which is what
 * it exists for — it is not a defence against a distributed attack. The
 * production upgrade is a shared store (Upstash Redis + `@upstash/ratelimit`)
 * behind the same `checkRateLimit` signature.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Drops expired windows so the map cannot grow without bound. */
function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — surfaced as `Retry-After`. */
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();

  // Cheap amortised cleanup; the map only ever holds active windows.
  if (windows.size > 1_000) {
    evictExpired(now);
  }

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;

  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  };
}

/**
 * Best-effort client identifier.
 *
 * Behind Vercel's proxy the leftmost `x-forwarded-for` entry is the real client
 * IP. Direct traffic can spoof it, which is acceptable here: the header is only
 * used to bucket rate limits, never to make an authorisation decision.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
