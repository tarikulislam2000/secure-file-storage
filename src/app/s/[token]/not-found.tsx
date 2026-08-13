import { FileQuestion, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Shown for any share link that does not resolve — unknown, revoked, or
 * pointing at a file that is no longer public. All three look identical, so the
 * page never reveals whether a token was ever real.
 */
export default function ShareNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold tracking-tight text-muted transition-colors hover:text-foreground"
      >
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        Secure File Storage
      </Link>

      <main className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-background text-muted">
          <FileQuestion className="size-7" aria-hidden />
        </span>

        <h1 className="mt-4 text-lg font-semibold">This file isn&apos;t available</h1>

        <p className="mt-2 text-sm text-muted">
          The link may have expired, been revoked by its owner, or never existed.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          Go to homepage
        </Link>
      </main>
    </div>
  );
}
