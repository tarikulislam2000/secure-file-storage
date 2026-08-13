"use client";

import { motion } from "framer-motion";
import { HardDrive } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/constants";
import type { StorageUsage } from "@/lib/types";

/**
 * Quota usage bar in a glassmorphic panel, matching the landing page.
 *
 * The fill shifts from the indigo→purple brand gradient to amber and then red
 * as the account fills up: colour carries the warning before the user reads a
 * single number.
 */
export function StorageMeter({ storage }: { storage: StorageUsage }) {
  const percent =
    storage.quota > 0 ? Math.min(100, (storage.used / storage.quota) * 100) : 0;

  const level = percent >= 90 ? "critical" : percent >= 75 ? "warning" : "ok";

  return (
    <section
      aria-label="Storage usage"
      className="rounded-xl border border-glass-border bg-glass p-4 shadow-sm backdrop-blur-md"
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
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/70"
      >
        <motion.div
          // Animated width rather than a CSS transition so the bar grows from
          // empty on first paint instead of snapping to its value.
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "h-full rounded-full",
            level === "critical"
              ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_12px_-2px_theme(colors.red.500)]"
              : level === "warning"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_-2px_theme(colors.amber.500)]"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_12px_-2px_theme(colors.indigo.500)]",
          )}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {storage.fileCount} file{storage.fileCount === 1 ? "" : "s"} ·{" "}
        {formatBytes(Math.max(0, storage.quota - storage.used))} free
      </p>
    </section>
  );
}
