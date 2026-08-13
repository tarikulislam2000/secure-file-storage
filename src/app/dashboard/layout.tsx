import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ToastProvider } from "@/components/ui/toast";
import { getSession } from "@/lib/auth";

/**
 * Authenticated shell.
 *
 * The session is resolved on the server, so the page is never rendered for a
 * signed-out visitor — there is no flash of dashboard chrome before a redirect.
 * The proxy also guards this path; this check is the one that actually decides,
 * since it runs where the data is.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              <span className="hidden sm:inline">Secure File Storage</span>
              <span className="sm:hidden">SFS</span>
            </Link>

            <SignOutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
