"use client";

import { useCallback, useRef, useState } from "react";

import { filesApi, toApiClientError, uploadToS3 } from "@/lib/api-client";
import {
  BLOCKED_FILE_EXTENSIONS,
  DEFAULT_MIME_TYPE,
  formatBytes,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";
import type { SerializedFile } from "@/lib/types";

/**
 * Drives the three-step upload for a queue of files.
 *
 *   1. ask our API for a presigned URL (and an opaque upload ticket)
 *   2. PUT the bytes straight to S3, reporting progress
 *   3. hand the ticket back so the server records the file
 *
 * Step 2 never touches our server, which is what allows 100 MB uploads on a
 * platform with a 4.5 MB request-body limit. Uploads run sequentially rather
 * than in parallel: several large concurrent PUTs share one uplink and simply
 * make every progress bar crawl.
 */

export type UploadStatus =
  | "queued"
  | "requesting"
  | "uploading"
  | "confirming"
  | "done"
  | "error"
  | "cancelled";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0-100, meaningful while `status === "uploading"`. */
  progress: number;
  error?: string;
  result?: SerializedFile;
}

/** Terminal states — nothing more will happen to these items. */
const SETTLED: readonly UploadStatus[] = ["done", "error", "cancelled"];

/**
 * The same rules the API enforces, applied before a request goes out.
 *
 * This is a courtesy to the user, not a security control: it turns a doomed
 * 100 MB transfer into instant feedback. The server re-checks everything, and
 * re-checks the size against what S3 actually stored.
 */
export function validateFile(file: File): string | null {
  if (file.size === 0) {
    return "File is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit (this file is ${formatBytes(file.size)}).`;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (
    extension &&
    (BLOCKED_FILE_EXTENSIONS as readonly string[]).includes(extension)
  ) {
    return `Files of type ".${extension}" are not allowed.`;
  }

  return null;
}

export function useUploader(options: { onUploaded?: () => void } = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);

  // One abort controller per in-flight item, so a single upload can be
  // cancelled without disturbing the rest of the queue.
  const controllers = useRef(new Map<string, AbortController>());
  // Read inside the loop, so cancelling an item that has not started yet is
  // seen immediately rather than one render late.
  const cancelled = useRef(new Set<string>());

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      if (cancelled.current.has(item.id)) {
        update(item.id, { status: "cancelled" });
        return;
      }

      const controller = new AbortController();
      controllers.current.set(item.id, controller);

      try {
        update(item.id, { status: "requesting", progress: 0 });

        const presign = await filesApi.requestUploadUrl({
          filename: item.file.name,
          fileSize: item.file.size,
          // Browsers leave `type` empty for unrecognised extensions; the API
          // signs whatever we send, so send something valid.
          mimeType: item.file.type || DEFAULT_MIME_TYPE,
        });

        update(item.id, { status: "uploading" });

        await uploadToS3({
          url: presign.uploadUrl,
          file: item.file,
          contentType: item.file.type || DEFAULT_MIME_TYPE,
          signal: controller.signal,
          onProgress: (progress) => update(item.id, { progress }),
        });

        // The bytes are in S3 but nothing is recorded yet; the file only exists
        // to the app once this succeeds.
        update(item.id, { status: "confirming", progress: 100 });

        const { file } = await filesApi.confirm(presign.uploadToken);

        update(item.id, { status: "done", progress: 100, result: file });
        options.onUploaded?.();
      } catch (error) {
        const apiError = toApiClientError(error);

        update(item.id, {
          status: apiError.code === "CANCELLED" ? "cancelled" : "error",
          error: apiError.message,
        });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [options, update],
  );

  /** Queues files and works through them one at a time. */
  const enqueue = useCallback(
    async (files: File[]) => {
      const queued: UploadItem[] = files.map((file) => {
        const validationError = validateFile(file);

        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          // Files that cannot possibly succeed are shown as failed immediately
          // instead of being sent and rejected a round trip later.
          status: validationError ? "error" : "queued",
          progress: 0,
          error: validationError ?? undefined,
        };
      });

      setItems((current) => [...current, ...queued]);
      setRunning(true);

      for (const item of queued) {
        if (item.status === "error") continue;
        await uploadOne(item);
      }

      setRunning(false);
    },
    [uploadOne],
  );

  const cancel = useCallback(
    (id: string) => {
      cancelled.current.add(id);
      controllers.current.get(id)?.abort();
      update(id, { status: "cancelled" });
    },
    [update],
  );

  /** Clears finished rows, leaving anything still in flight alone. */
  const clearSettled = useCallback(() => {
    setItems((current) => current.filter((item) => !SETTLED.includes(item.status)));
  }, []);

  const reset = useCallback(() => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();
    cancelled.current.clear();
    setItems([]);
    setRunning(false);
  }, []);

  return {
    items,
    running,
    enqueue,
    cancel,
    clearSettled,
    reset,
    hasSettled: items.some((item) => SETTLED.includes(item.status)),
    succeeded: items.filter((item) => item.status === "done").length,
  };
}
