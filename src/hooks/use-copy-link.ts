"use client";

import { useCallback, useState } from "react";

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

      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), resetAfterMs);
      } catch {
        // Clipboard access can be denied (insecure origin, permissions policy).
        // A prompt still lets the user select and copy the link by hand.
        window.prompt("Copy this share link:", value);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
