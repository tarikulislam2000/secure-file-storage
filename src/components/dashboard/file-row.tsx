"use client";

import { motion } from "framer-motion";
import {
  Check,
  Download,
  Globe,
  Link2,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";

import { FileThumbnail } from "@/components/dashboard/file-thumbnail";
import { useCopyLink } from "@/hooks/use-copy-link";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/constants";
import type { SerializedFile } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Shared action-button styling.
 *
 * Every control gets a border so the row reads as a set of affordances rather
 * than floating glyphs, and the hover state is what distinguishes them.
 */
const actionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-glass-border bg-surface/60 px-2.5 text-xs font-medium text-muted transition-all duration-200 hover:border-primary/40 hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

export function FileRow({
  file,
  index = 0,
  busy,
  onDownload,
  onToggleVisibility,
  onDelete,
}: {
  file: SerializedFile;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
  busy: boolean;
  onDownload: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const { copied, copy } = useCopyLink();

  return (
    <motion.li
      // `animate`, not `whileInView`: a row must never be able to get stuck
      // invisible if it happens to mount outside the viewport.
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        // Cap the stagger so page 5 of a list does not wait on 100 delays.
        delay: Math.min(index, 12) * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "flex flex-col gap-3 p-4 transition-all duration-200 hover:bg-row-hover",
        "sm:flex-row sm:items-center sm:gap-4",
        busy && "opacity-60",
      )}
    >
      <FileThumbnail file={file} variant="square" />

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
          <button
            type="button"
            onClick={() => copy(file.shareUrl)}
            aria-label={`Copy share link for ${file.filename}`}
            className={cn(actionClass, copied && "border-success/40 text-success")}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Link2 className="size-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Link"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={busy}
          aria-label={
            file.isPublic
              ? `Make ${file.filename} private`
              : `Make ${file.filename} public`
          }
          className={actionClass}
        >
          {file.isPublic ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <Globe className="size-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {file.isPublic ? "Make private" : "Share"}
          </span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          aria-label={`Download ${file.filename}`}
          className={cn(
            actionClass,
            "border-primary/30 bg-primary-soft text-primary hover:border-primary/60 hover:bg-primary-soft hover:text-primary",
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">Download</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${file.filename}`}
          className={cn(
            actionClass,
            "px-2 hover:border-danger/50 hover:bg-danger-soft hover:text-danger",
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </motion.li>
  );
}
