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

const actionClass =
  "inline-flex size-8 items-center justify-center rounded-lg border border-glass-border bg-surface/60 text-muted transition-all duration-200 hover:border-primary/40 hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Grid tile: a media preview above the filename, size, visibility badge and the
 * same actions the list row offers.
 */
export function FileCard({
  file,
  index = 0,
  busy,
  onDownload,
  onToggleVisibility,
  onDelete,
}: {
  file: SerializedFile;
  index?: number;
  busy: boolean;
  onDownload: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const { copied, copy } = useCopyLink();

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index, 12) * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-glass-border bg-glass backdrop-blur-md",
        "transition-colors duration-200 hover:border-primary/40",
        busy && "opacity-60",
      )}
    >
      <FileThumbnail file={file} variant="cover" />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={file.filename}>
            {file.filename}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <span>{formatBytes(file.fileSize)}</span>
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

        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            aria-label={`Download ${file.filename}`}
            className={cn(
              actionClass,
              "border-primary/30 bg-primary-soft text-primary hover:border-primary/60 hover:text-primary",
            )}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
          </button>

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
              <Lock className="size-4" aria-hidden />
            ) : (
              <Globe className="size-4" aria-hidden />
            )}
          </button>

          {file.isPublic && (
            <button
              type="button"
              onClick={() => copy(file.shareUrl)}
              aria-label={`Copy share link for ${file.filename}`}
              className={cn(
                actionClass,
                copied && "border-success/40 text-success",
              )}
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${file.filename}`}
            className={cn(
              actionClass,
              "ml-auto hover:border-danger/50 hover:bg-danger-soft hover:text-danger",
            )}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
