"use client";

import {
  Archive,
  Check,
  Download,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Music,
  Trash2,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBytes, type FileCategory } from "@/lib/constants";
import type { SerializedFile } from "@/lib/types";

const CATEGORY_ICON: Record<
  FileCategory,
  ComponentType<{ className?: string }>
> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: FileText,
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function FileRow({
  file,
  busy,
  onDownload,
  onToggleVisibility,
  onDelete,
}: {
  file: SerializedFile;
  busy: boolean;
  onDownload: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const Icon = CATEGORY_ICON[file.category];
  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    if (!file.shareUrl) return;

    try {
      await navigator.clipboard.writeText(file.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions policy);
      // a select-and-copy fallback keeps the link reachable either way.
      window.prompt("Copy this share link:", file.shareUrl);
    }
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-3 p-4 transition-colors hover:bg-surface-hover",
        "sm:flex-row sm:items-center sm:gap-4",
        busy && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          file.isPublic ? "bg-primary-soft text-primary" : "bg-background text-muted",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={file.filename}>
          {file.filename}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{formatBytes(file.fileSize)}</span>
          <span aria-hidden>·</span>
          <time dateTime={file.createdAt}>
            {dateFormatter.format(new Date(file.createdAt))}
          </time>
          <span aria-hidden>·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              file.isPublic ? "text-primary" : "text-muted",
            )}
          >
            {file.isPublic ? (
              <Globe className="size-3" aria-hidden />
            ) : (
              <Lock className="size-3" aria-hidden />
            )}
            {file.isPublic ? "Public" : "Private"}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {file.isPublic && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyShareLink}
            aria-label={`Copy share link for ${file.filename}`}
          >
            {copied ? (
              <Check className="size-4 text-success" aria-hidden />
            ) : (
              <Link2 className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Link"}</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          disabled={busy}
          aria-label={
            file.isPublic
              ? `Make ${file.filename} private`
              : `Make ${file.filename} public`
          }
        >
          {file.isPublic ? (
            <Lock className="size-4" aria-hidden />
          ) : (
            <Globe className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {file.isPublic ? "Make private" : "Share"}
          </span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onDownload}
          disabled={busy}
          aria-label={`Download ${file.filename}`}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${file.filename}`}
          className="text-muted hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
