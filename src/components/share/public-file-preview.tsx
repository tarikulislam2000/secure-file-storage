"use client";

import {
  Archive,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import type { FileCategory } from "@/lib/constants";
import type { PublicFile } from "@/lib/types";

const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: FileText,
};

/**
 * Inline preview for a shared file.
 *
 * Images and video replace the icon entirely; audio keeps the icon (there is
 * nothing to look at) and adds a player beneath it. Everything else — and
 * anything that fails to load — falls back to the icon, so a link whose
 * 15-minute preview URL has expired degrades to the plain card rather than a
 * broken player.
 *
 * The media is served from S3 on a different origin with its content type
 * pinned at signing time, so an uploaded file cannot execute in this page's
 * origin no matter what it actually contains.
 */
export function PublicFilePreview({ file }: { file: PublicFile }) {
  const [failed, setFailed] = useState(false);

  const Icon = CATEGORY_ICON[file.category];
  const mimeType = file.mimeType.toLowerCase();
  const canPlay = Boolean(file.downloadUrl) && !failed;

  const isImage = canPlay && mimeType.startsWith("image/");
  const isVideo = canPlay && mimeType.startsWith("video/");
  const isAudio = canPlay && mimeType.startsWith("audio/");

  if (isImage) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        {/*
          Decorative: the filename is rendered as the heading directly below, so
          repeating it here would only make a screen reader announce it twice.
          next/image is avoided because a presigned URL's signature changes on
          every render, so the optimizer could never serve a cache hit.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.downloadUrl}
          alt=""
          onError={() => setFailed(true)}
          className="mx-auto max-h-[350px] w-full object-contain"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={file.downloadUrl}
        controls
        // Fetch only enough for a poster frame and duration; the body streams
        // when the visitor presses play, not on page load.
        preload="metadata"
        onError={() => setFailed(true)}
        className="max-h-[350px] w-full rounded-lg bg-black"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="flex size-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-7" aria-hidden />
      </span>

      {isAudio && (
        <audio
          src={file.downloadUrl}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
          className="w-full"
        />
      )}
    </div>
  );
}
