"use client";

import { HardDrive } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/constants";
import type { StorageUsage } from "@/lib/types";

/** Quota usage bar. Shifts colour as the account approaches its limit. */
export function StorageMeter({ storage }: { storage: StorageUsage }) {
  const percent =
    storage.quota > 0
      ? Math.min(100, (storage.used / storage.quota) * 100)
      : 0;

  const level = percent >= 90 ? "critical" : percent >= 75 ? "warning" : "ok";

  return (
    <section
      aria-label="Storage usage"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="size-4 text-muted" aria-hidden />
          Storage
        </div>

        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">
            {formatBytes(storage.used)}
          </span>{" "}
          of {formatBytes(storage.quota)}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(percent)}% of storage used`}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            level === "critical"
              ? "bg-danger"
              : level === "warning"
                ? "bg-warning"
                : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {storage.fileCount} file{storage.fileCount === 1 ? "" : "s"} ·{" "}
        {formatBytes(Math.max(0, storage.quota - storage.used))} free
      </p>
    </section>
  );
}
