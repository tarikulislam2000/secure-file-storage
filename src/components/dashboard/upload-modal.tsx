"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useUploader, type UploadItem } from "@/hooks/use-uploader";
import { cn } from "@/lib/cn";
import { formatBytes, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

/**
 * Upload dialog: drag-and-drop or browse, with a live progress bar per file.
 *
 * Files are queued individually, so one rejected file (too large, blocked type)
 * never blocks the rest of a batch.
 */
export function UploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const uploader = useUploader({ onUploaded });

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void uploader.enqueue(files);
  }

  function handleClose() {
    // Closing mid-transfer would abandon the upload with no way back to it, so
    // the dialog stays put until the queue drains.
    if (uploader.running) return;

    uploader.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Upload files"
      description={`Up to ${formatBytes(MAX_FILE_SIZE_BYTES)} per file.`}
      className="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary-soft"
              : "border-border bg-background",
          )}
        >
          <UploadCloud
            className={cn(
              "mx-auto size-9 transition-colors",
              dragging ? "text-primary" : "text-muted",
            )}
            aria-hidden
          />

          <p className="mt-3 text-sm font-medium">
            Drag files here, or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-primary underline-offset-2 hover:underline"
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-muted">
            Executable file types are not accepted.
          </p>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            aria-label="Choose files to upload"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) void uploader.enqueue(files);
              // Reset so re-picking the same file fires `change` again.
              event.target.value = "";
            }}
          />
        </div>

        {uploader.items.length > 0 && (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {uploader.items.map((item) => (
              <UploadRow
                key={item.id}
                item={item}
                onCancel={() => uploader.cancel(item.id)}
              />
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted" aria-live="polite">
            {uploader.running
              ? "Uploading — keep this window open."
              : uploader.succeeded > 0
                ? `${uploader.succeeded} file${uploader.succeeded === 1 ? "" : "s"} uploaded.`
                : "No uploads yet."}
          </p>

          <div className="flex gap-2">
            {uploader.hasSettled && !uploader.running && (
              <Button variant="ghost" size="sm" onClick={uploader.clearSettled}>
                Clear
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={uploader.running}
            >
              {uploader.succeeded > 0 ? "Done" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  queued: "Waiting",
  requesting: "Preparing",
  uploading: "Uploading",
  confirming: "Finishing",
  done: "Uploaded",
  error: "Failed",
  cancelled: "Cancelled",
};

function UploadRow({
  item,
  onCancel,
}: {
  item: UploadItem;
  onCancel: () => void;
}) {
  const inFlight =
    item.status === "requesting" ||
    item.status === "uploading" ||
    item.status === "confirming";

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        {item.status === "done" ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        ) : item.status === "error" ? (
          <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden />
        ) : inFlight ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="text-xs text-muted">
            {formatBytes(item.file.size)} · {STATUS_LABEL[item.status]}
            {item.status === "uploading" && ` · ${item.progress}%`}
          </p>
        </div>

        {inFlight && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Cancel upload of ${item.file.name}`}
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {item.error && (
        <p className="mt-2 text-xs text-danger">{item.error}</p>
      )}

      {inFlight && (
        <div
          role="progressbar"
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress for ${item.file.name}`}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
    </li>
  );
}
