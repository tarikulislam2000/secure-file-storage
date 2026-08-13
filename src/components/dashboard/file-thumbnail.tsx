"use client";

import {
  Archive,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { FileCategory } from "@/lib/constants";
import type { SerializedFile } from "@/lib/types";

/** Single source of truth for the icon shown per category. */
export const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: FileText,
};

/**
 * Media preview with an icon fallback, shared by the list row and the grid card.
 *
 * `downloadUrl` is a presigned URL with a short lifetime, so it can expire while
 * a tab sits open, and only images and video ever carry one. Any load failure
 * falls back to the category icon rather than leaving a broken-image glyph.
 *
 * `variant` changes only the framing — the decision about *what* to render is
 * identical in both places, which is the part worth keeping in one file.
 */
export function FileThumbnail({
  file,
  variant,
  className,
}: {
  file: SerializedFile;
  variant: "square" | "cover";
  className?: string;
}) {
  const Icon = CATEGORY_ICON[file.category];
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isImage = file.category === "image";
  const isVideo = file.category === "video";
  const canPreview = Boolean(file.downloadUrl) && !failed && (isImage || isVideo);

  const isSquare = variant === "square";

  if (!canPreview) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          isSquare
            ? cn(
                "size-10 rounded-lg border border-glass-border",
                file.isPublic
                  ? "bg-primary-soft text-primary"
                  : "bg-background text-muted",
              )
            : "aspect-video w-full border-b border-border bg-background text-muted",
          className,
        )}
      >
        <Icon className={isSquare ? "size-5" : "size-8"} aria-hidden />
      </span>
    );
  }

  const mediaClass = cn(
    "size-full object-cover",
    isSquare && "rounded-lg",
  );

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-background",
        isSquare
          ? "size-10 rounded-lg border border-glass-border"
          : "aspect-video w-full border-b border-border",
        className,
      )}
    >
      {isImage ? (
        // next/image is deliberately not used: it would route private files
        // through our optimizer, and a presigned URL's signature changes on
        // every list response, so the optimizer's cache could never hit.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.downloadUrl}
          // Decorative: the filename sits beside it as the accessible name.
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={mediaClass}
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
          className={mediaClass}
        />
      )}

      {isVideo && !isSquare && (
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
