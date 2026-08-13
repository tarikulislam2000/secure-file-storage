"use client";

import { useCallback, useState } from "react";

/**
 * Resolves a share link to a clean, absolute URL.
 *
 * The API returns an absolute URL when `NEXT_PUBLIC_APP_URL` is configured and a
 * root-relative path otherwise, so this is where the browser's own origin fills
 * the gap. Running every value through `URL` also normalises it — an absolute
 * link passes through unchanged, and nothing can reach the clipboard as a
 * half-built string.
 *
 * Whatever is copied here is pasted into WhatsApp, Slack or an email, where a
 * malformed URL is not merely ugly: the recipient's client will linkify the
 * wrong span of text and the link will not open.
 */
function toAbsoluteUrl(value: string): string {
  if (typeof window === "undefined") {
    return value;
  }

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    // Unparseable even against a known origin — hand back the original rather
    // than silently copying nothing.
    return value;
  }
}

/**
 * Copy-to-clipboard with a short-lived "copied" acknowledgement.
 *
 * Shared by the list row and the grid card so both give identical feedback for
 * the same action.
 */
export function useCopyLink(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string | null) => {
      if (!value) return;

      const url = toAbsoluteUrl(value);

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), resetAfterMs);
      } catch {
        // Clipboard access can be denied (insecure origin, permissions policy).
        // A prompt still lets the user select and copy the link by hand.
        window.prompt("Copy this share link:", url);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
