import { ArrowRight, Globe, Lock, ShieldCheck, UploadCloud } from "lucide-react";
import Link from "next/link";

import { formatBytes, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { getSession } from "@/lib/auth";

const FEATURES = [
  {
    icon: UploadCloud,
    title: `Uploads up to ${formatBytes(MAX_FILE_SIZE_BYTES)}`,
    body: "Files stream straight from your browser to S3 with a live progress bar — never through a server that could stall on them.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "The storage bucket is closed to the public. Every download is authorised first, then signed for a limited time.",
  },
  {
    icon: Globe,
    title: "Sharing you can take back",
    body: "Publish a file to get a link. Make it private again and that link is dead for good, even if you republish later.",
  },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Secure File Storage
          </span>

          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Dashboard
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Get started
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Store large files without handing them to the internet.
          </h1>

          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            Private storage with time-limited download links, revocable public
            sharing, and direct-to-S3 uploads that do not choke on big files.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session ? "/dashboard" : "/register"}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
            >
              {session ? "Open dashboard" : "Create a free account"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>

            {!session && (
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:bg-surface-hover"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <feature.icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-medium">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="mx-auto w-full max-w-5xl px-4 text-xs text-muted">
          Built with Next.js, Prisma and AWS S3.
        </p>
      </footer>
    </div>
  );
}
