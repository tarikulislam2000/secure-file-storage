import type { FileCategory } from "@/lib/constants";

/**
 * The API's wire types.
 *
 * Client-safe by construction — no `server-only`, no Node imports — so the
 * browser and the route handlers describe the same payloads from one
 * definition and cannot drift apart.
 */

export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
}

/** A file as returned by the owner-facing endpoints. */
export interface SerializedFile {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  isPublic: boolean;
  /** Present only while the file is public. */
  shareUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A file as seen by an anonymous visitor holding a share link. */
export interface PublicFile {
  filename: string;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StorageUsage {
  used: number;
  quota: number;
  fileCount: number;
}

export interface FileListResponse {
  files: SerializedFile[];
  pagination: Pagination;
  storage: StorageUsage;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  uploadToken: string;
  key: string;
  expiresIn: number;
  maxFileSize: number;
}

export interface DownloadResponse {
  url: string;
  expiresIn: number;
  filename: string;
  fileSize: number;
  mimeType: string;
}

/** The uniform failure envelope every endpoint returns. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-keyed messages, present on validation failures. */
    details?: Record<string, string>;
  };
}
