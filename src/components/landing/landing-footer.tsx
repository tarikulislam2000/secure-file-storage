import { ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Footer.
 *
 * A plain server component — nothing here animates, so there is no reason to
 * ship it to the client bundle.
 */

const REPO_URL = "https://github.com/tarikulislam2000/secure-file-storage";

const STACK = [
  "Next.js 16",
  "TypeScript",
  "Prisma 7",
  "PostgreSQL",
  "AWS S3",
  "Tailwind CSS",
];

/**
 * GitHub's mark, inlined.
 *
 * Lucide v1 removed brand glyphs, and pulling in an icon pack for one logo
 * would not be worth the bytes.
 */
function GithubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="size-4"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="flex items-center gap-2 font-semibold tracking-tight">
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              Secure File Storage
            </span>

            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              All systems operational
            </p>
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {STACK.map((item) => (
              <li
                key={item}
                className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built as a full-stack engineering assessment · MIT licensed
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              // `noopener` denies the opened tab access to `window.opener`;
              // `noreferrer` keeps our URL out of its referrer header.
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <GithubMark />
              Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
