"use client";

import { AlertCircle, Inbox, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { FileCard } from "@/components/dashboard/file-card";
import { FileRow } from "@/components/dashboard/file-row";
import { FileSkeleton } from "@/components/dashboard/file-skeleton";
import {
  DEFAULT_FILTERS,
  FileToolbar,
  type FileFilters,
} from "@/components/dashboard/file-toolbar";
import { StorageMeter } from "@/components/dashboard/storage-meter";
import { UploadModal } from "@/components/dashboard/upload-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { filesApi, toApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { FileListResponse, SerializedFile, ViewMode } from "@/lib/types";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The dashboard.
 *
 * Owns the list query and every mutation on it. Filters are debounced and each
 * request supersedes the one before it, so typing quickly cannot leave a stale
 * response painted over a newer one.
 */
export function DashboardView({ email }: { email: string }) {
  const toast = useToast();

  const [filters, setFilters] = useState<FileFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SerializedFile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Aborts the previous request whenever a new one starts.
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    inFlight.current?.abort();

    const controller = new AbortController();
    inFlight.current = controller;

    setLoading(true);

    try {
      const result = await filesApi.list(
        { ...filters, page, limit: PAGE_SIZE },
        controller.signal,
      );

      setData(result);
      setError(null);
    } catch (caught) {
      const apiError = toApiClientError(caught);

      // A superseded request is not a failure the user should see.
      if (apiError.code === "CANCELLED") return;

      setError(apiError.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filters, page]);

  // Debounced so a search reads as one request per pause, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  function handleFiltersChange(next: FileFilters) {
    setFilters(next);
    // A narrower filter can leave the current page beyond the last one.
    setPage(1);
  }

  async function handleDownload(file: SerializedFile) {
    setBusyId(file.id);

    try {
      const { url } = await filesApi.download(file.id);
      // The presigned URL carries Content-Disposition: attachment, so the
      // browser downloads it and the dashboard stays put.
      window.location.assign(url);
    } catch (caught) {
      toast.error(toApiClientError(caught).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVisibility(file: SerializedFile) {
    setBusyId(file.id);

    try {
      const { file: updated } = await filesApi.setVisibility(
        file.id,
        !file.isPublic,
      );

      setData((current) =>
        current
          ? {
              ...current,
              files: current.files.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );

      toast.success(
        updated.isPublic
          ? "File is public. Anyone with the link can download it."
          : "File is private again. The previous share link no longer works.",
      );
    } catch (caught) {
      toast.error(toApiClientError(caught).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(file: SerializedFile) {
    setBusyId(file.id);
    setPendingDelete(null);

    try {
      await filesApi.remove(file.id);
      toast.success(`"${file.filename}" deleted.`);
      await load();
    } catch (caught) {
      toast.error(toApiClientError(caught).message);
    } finally {
      setBusyId(null);
    }
  }

  const files = data?.files ?? [];
  const pagination = data?.pagination;
  // True only when the grid is actually showing cards — the error, loading and
  // empty states are single blocks that still want the framed panel.
  const hasCards = viewMode === "grid" && !error && files.length > 0;
  const isFiltered =
    filters.q !== "" || filters.category !== "" || filters.visibility !== "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your files</h1>
          <p className="mt-0.5 text-sm text-muted">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </div>

        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" aria-hidden />
          Upload
        </Button>
      </div>

      {data && <StorageMeter storage={data.storage} />}

      <FileToolbar
        filters={filters}
        onChange={handleFiltersChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* The grid's cards carry their own borders, so the surrounding panel is
          only drawn when there is a single block to frame. */}
      <section
        className={cn(
          hasCards
            ? ""
            : "overflow-hidden rounded-xl border border-border bg-surface",
        )}
      >
        {error ? (
          <EmptyState
            icon={<AlertCircle className="size-8 text-danger" aria-hidden />}
            title="Could not load your files"
            body={error}
            action={
              <Button variant="secondary" size="sm" onClick={load}>
                Try again
              </Button>
            }
          />
        ) : loading && !data ? (
          <div aria-busy aria-label="Loading files">
            <FileSkeleton viewMode={viewMode} />
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8 text-muted" aria-hidden />}
            title={isFiltered ? "No matching files" : "No files yet"}
            body={
              isFiltered
                ? "Try a different search term or clear the filters."
                : "Upload your first file to get started."
            }
            action={
              isFiltered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
                >
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="size-4" aria-hidden />
                  Upload a file
                </Button>
              )
            }
          />
        ) : viewMode === "grid" ? (
          <ul
            aria-busy={loading}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {files.map((file, index) => (
              <FileCard
                key={file.id}
                file={file}
                index={index}
                busy={busyId === file.id}
                onDownload={() => handleDownload(file)}
                onToggleVisibility={() => handleToggleVisibility(file)}
                onDelete={() => setPendingDelete(file)}
              />
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border" aria-busy={loading}>
            {files.map((file, index) => (
              <FileRow
                key={file.id}
                file={file}
                index={index}
                busy={busyId === file.id}
                onDownload={() => handleDownload(file)}
                onToggleVisibility={() => handleToggleVisibility(file)}
                onDelete={() => setPendingDelete(file)}
              />
            ))}
          </ul>
        )}
      </section>

      {pagination && pagination.totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-3"
        >
          <p className="text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
            file{pagination.total === 1 ? "" : "s"}
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pagination.hasMore || loading}
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={load}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete file?"
        description={
          pendingDelete
            ? `"${pendingDelete.filename}" will be removed from storage permanently. This cannot be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => pendingDelete && handleDelete(pendingDelete)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-12 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
