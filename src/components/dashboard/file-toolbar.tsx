"use client";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { FILE_CATEGORIES } from "@/lib/constants";

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

const selectClass =
  "h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-foreground transition-colors hover:bg-surface-hover";

export function FileToolbar({
  filters,
  onChange,
}: {
  filters: FileFilters;
  onChange: (filters: FileFilters) => void;
}) {
  const isFiltered =
    filters.q !== "" || filters.category !== "" || filters.visibility !== "";

  function set(patch: Partial<FileFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted"
        />
      </div>

      <select
        value={filters.category}
        onChange={(event) => set({ category: event.target.value })}
        aria-label="Filter by file type"
        className={cn(selectClass, filters.category && "border-primary")}
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
        className={cn(selectClass, filters.visibility && "border-primary")}
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
        className={selectClass}
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
    </div>
  );
}
