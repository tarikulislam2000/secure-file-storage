import { cn } from "@/lib/cn";
import type { ViewMode } from "@/lib/types";

/**
 * Loading placeholder shaped like the content it replaces.
 *
 * Mirroring the real row and card geometry means the layout does not jump when
 * data lands — a spinner in the middle of an empty panel gives the browser no
 * idea how tall the result will be.
 *
 * Presentational only: the live region announcing "loading" lives on the list
 * container, so these are hidden from assistive tech rather than read out as a
 * dozen empty items.
 */
export function FileSkeleton({
  viewMode,
  count = 5,
}: {
  viewMode: ViewMode;
  count?: number;
}) {
  const items = Array.from({ length: count }, (_, index) => index);

  if (viewMode === "grid") {
    return (
      <ul
        aria-hidden
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {items.map((index) => (
          <li
            key={index}
            className="overflow-hidden rounded-xl border border-glass-border bg-glass backdrop-blur-md"
          >
            <div className="aspect-video w-full animate-pulse bg-border/60" />
            <div className="space-y-2 p-3">
              <Bar className="h-3.5 w-3/4" />
              <Bar className="h-3 w-1/2" />
              <div className="flex gap-1.5 pt-1">
                <Bar className="size-8 rounded-lg" />
                <Bar className="size-8 rounded-lg" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-hidden className="divide-y divide-border">
      {items.map((index) => (
        <li key={index} className="flex items-center gap-4 p-4">
          <Bar className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3.5 w-1/3" />
            <Bar className="h-3 w-1/4" />
          </div>
          <Bar className="hidden h-8 w-24 rounded-lg sm:block" />
          <Bar className="hidden h-8 w-24 rounded-lg sm:block" />
        </li>
      ))}
    </ul>
  );
}

function Bar({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-border/60", className)} />
  );
}
