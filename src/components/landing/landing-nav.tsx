import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Landing navigation.
 *
 * Sits over the dark hero, so it carries its own dark treatment rather than
 * theme tokens — the section beneath it is fixed dark in both colour schemes.
 */
export function LandingNav({ hasSession }: { hasSession: boolean }) {
  // Near-opaque background: at scroll position 0 there is light page background
  // behind the bar, and a more transparent one washes out to grey against it.
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-white"
        >
          <ShieldCheck className="size-5 text-indigo-400" aria-hidden />
          Secure File Storage
        </Link>

        {hasSession ? (
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 text-sm font-medium text-white transition-all hover:from-indigo-400 hover:to-fuchsia-500"
          >
            Dashboard
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 text-sm font-medium text-white transition-all hover:from-indigo-400 hover:to-fuchsia-500"
            >
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
