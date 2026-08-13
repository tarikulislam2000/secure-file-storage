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
import { useRef, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { useCopyLink } from "@/hooks/use-copy-link";
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

/**
 * Grid tile: a media preview above the filename, size, visibility badge and the
 * same actions the list row offers.
 */
export function FileCard({
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
  const { copied, copy } = useCopyLink();

  return (
    <li
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        "transition-colors hover:border-primary/40",
        busy && "opacity-60",
      )}
    >
      <FilePreview file={file} />

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

        <div className="mt-auto flex items-center gap-0.5 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            disabled={busy}
            aria-label={`Download ${file.filename}`}
            className="px-2"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
          </Button>

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
            className="px-2"
          >
            {file.isPublic ? (
              <Lock className="size-4" aria-hidden />
            ) : (
              <Globe className="size-4" aria-hidden />
            )}
          </Button>

          {file.isPublic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copy(file.shareUrl)}
              aria-label={`Copy share link for ${file.filename}`}
              className="px-2"
            >
              {copied ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${file.filename}`}
            className="ml-auto px-2 text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * The preview pane.
 *
 * `downloadUrl` is a presigned URL with a short lifetime, so it can expire
 * while a tab sits open. Any load failure falls back to the category icon
 * rather than leaving a broken-image glyph in the grid.
 */
function FilePreview({ file }: { file: SerializedFile }) {
  const Icon = CATEGORY_ICON[file.category];
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const canPreview = Boolean(file.downloadUrl) && !failed;
  const isImage = file.category === "image";
  const isVideo = file.category === "video";

  if (!canPreview || (!isImage && !isVideo)) {
    return (
      <div className="flex aspect-video items-center justify-center border-b border-border bg-background">
        <Icon className="size-8 text-muted" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden border-b border-border bg-background">
      {isImage ? (
        // next/image is deliberately not used: it would route private files
        // through our optimizer, and a presigned URL's signature changes on
        // every list response, so the optimizer's cache could never hit.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.downloadUrl}
          // Decorative: the filename directly below is the accessible name, so
          // announcing it twice would only add noise.
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          src={file.downloadUrl}
          muted
          loop
          playsInline
          // Fetch just enough for a poster frame; the full file only streams if
          // the user actually hovers.
          preload="metadata"
          onError={() => setFailed(true)}
          onMouseEnter={() => {
            void videoRef.current?.play().catch(() => {
              // Autoplay can be refused by policy; the still frame is fine.
            });
          }}
          onMouseLeave={() => {
            const video = videoRef.current;
            if (!video) return;
            video.pause();
            video.currentTime = 0;
          }}
          className="size-full object-cover"
        />
      )}

      {isVideo && (
        <span
          className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
          aria-hidden
        >
          Video
        </span>
      )}
    </div>
  );
}
