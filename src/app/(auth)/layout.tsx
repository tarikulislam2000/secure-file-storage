import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Centred card shell for the sign-in and sign-up screens.
 *
 * A route group, so `(auth)` shapes the layout without appearing in the URL —
 * the pages stay at `/login` and `/register`, which is what the proxy matches.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <ShieldCheck className="size-6 text-primary" aria-hidden />
        Secure File Storage
      </Link>

      <main className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {children}
      </main>
    </div>
  );
}
