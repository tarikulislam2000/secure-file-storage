import { Download, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PublicFilePreview } from "@/components/share/public-file-preview";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/constants";
import { serializePublicFile } from "@/lib/files";
import { prisma } from "@/lib/prisma";

/**
 * Public share page.
 *
 * Rendered on the server straight from the database rather than fetching our
 * own API over HTTP — one less round trip, and the metadata renders with
 * JavaScript disabled. The download button points at the redirect route, so the
 * URL behind it is minted fresh at click time rather than embedded in HTML that
 * might be cached or forwarded.
 */

/**
 * `cache()` because Next.js calls `generateMetadata` and the page in the same
 * render pass — without it every share view costs two identical queries and two
 * presigned URLs.
 */
const loadSharedFile = cache(async (token: string) => {
  const file = await prisma.file.findFirst({
    where: { shareToken: token, isPublic: true },
  });

  return file ? serializePublicFile(file) : null;
});

export async function generateMetadata({
  params,
}: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const file = await loadSharedFile(token);

  return {
    title: file ? `${file.filename} — shared file` : "File not available",
    // A share link should not be indexed: the owner chose to give it to
    // specific people, not to publish it to search engines.
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const file = await loadSharedFile(token);

  // Unknown token, revoked link and private file all land here, so the page
  // never confirms whether a token was ever valid.
  if (!file) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold tracking-tight text-muted transition-colors hover:text-foreground"
      >
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        Secure File Storage
      </Link>

      <main
        className={cn(
          "w-full rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8",
          // Media needs the extra width; an icon card looks lost in it.
          file.downloadUrl ? "max-w-lg" : "max-w-md",
        )}
      >
        <PublicFilePreview file={file} />

        <h1 className="mt-4 truncate text-lg font-semibold" title={file.filename}>
          {file.filename}
        </h1>

        <p className="mt-1 text-sm text-muted">
          {formatBytes(file.fileSize)} · Shared{" "}
          <time dateTime={file.createdAt}>
            {new Intl.DateTimeFormat(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(file.createdAt))}
          </time>
        </p>

        <a
          href={`/api/public/files/${token}/download`}
          className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Download className="size-4" aria-hidden />
          Download
        </a>

        <p className="mt-4 text-xs text-muted">
          Shared publicly by the file&apos;s owner. The owner can revoke this
          link at any time.
        </p>
      </main>

      <Link
        href="/register"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        Store your own files securely →
      </Link>
    </div>
  );
}
