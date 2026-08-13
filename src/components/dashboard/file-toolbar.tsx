"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { FILE_CATEGORIES } from "@/lib/constants";
import type { ViewMode } from "@/lib/types";

/** The controlled query state the dashboard drives its list from. */
export interface FileFilters {
  q: string;
  category: string;
  visibility: string;
  sort: string;
  order: string;
}

export const DEFAULT_FILTERS: FileFilters = {
  q: "",
  category: "",
  visibility: "",
  sort: "createdAt",
  order: "desc",
};

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "filename:asc", label: "Name (A-Z)" },
  { value: "filename:desc", label: "Name (Z-A)" },
  { value: "fileSize:desc", label: "Largest first" },
  { value: "fileSize:asc", label: "Smallest first" },
];

/**
 * Every control is `h-9` on the same glass treatment so the search field,
 * the three selects and the view toggle sit on one unbroken line.
 *
 * The focus ring replaces the global outline here rather than stacking with it,
 * which would draw two rings around a single input.
 */
const CONTROL_BASE =
  "h-9 rounded-lg border border-glass-border bg-glass text-sm text-foreground backdrop-blur-md transition-all duration-200 hover:border-primary/40";

export function FileToolbar({
  filters,
  onChange,
  viewMode,
  onViewModeChange,
}: {
  filters: FileFilters;
  onChange: (filters: FileFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const isFiltered =
    filters.q !== "" || filters.category !== "" || filters.visibility !== "";

  function set(patch: Partial<FileFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-56">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={filters.q}
          onChange={(event) => set({ q: event.target.value })}
          placeholder="Search files…"
          aria-label="Search files by name"
          className={cn(CONTROL_BASE, "w-full pl-9 pr-3 placeholder:text-muted")}
        />
      </div>

      <select
        value={filters.category}
        onChange={(event) => set({ category: event.target.value })}
        aria-label="Filter by file type"
        className={cn(CONTROL_BASE, "px-2.5", filters.category && "border-primary/60")}
      >
        <option value="">All types</option>
        {FILE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category[0].toUpperCase() + category.slice(1)}
          </option>
        ))}
      </select>

      <select
        value={filters.visibility}
        onChange={(event) => set({ visibility: event.target.value })}
        aria-label="Filter by visibility"
        className={cn(
          CONTROL_BASE,
          "px-2.5",
          filters.visibility && "border-primary/60",
        )}
      >
        <option value="">All files</option>
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>

      <select
        value={`${filters.sort}:${filters.order}`}
        onChange={(event) => {
          const [sort, order] = event.target.value.split(":");
          set({ sort, order });
        }}
        aria-label="Sort files"
        className={cn(CONTROL_BASE, "px-2.5")}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {isFiltered && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          Clear
        </button>
      )}

      <div
        role="group"
        aria-label="View mode"
        className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-glass-border bg-glass p-0.5 backdrop-blur-md sm:ml-auto"
      >
        <ViewModeButton
          active={viewMode === "list"}
          onClick={() => onViewModeChange("list")}
          label="List view"
          icon={<List className="size-4" aria-hidden />}
        />
        <ViewModeButton
          active={viewMode === "grid"}
          onClick={() => onViewModeChange("grid")}
          label="Grid view"
          icon={<LayoutGrid className="size-4" aria-hidden />}
        />
      </div>
    </div>
  );
}

function ViewModeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // `aria-pressed` is what makes a pair of icon buttons read as a toggle
      // rather than as two unrelated actions.
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-all duration-200",
        "",
        active
          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm"
          : "text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
