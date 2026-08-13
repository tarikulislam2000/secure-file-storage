/**
 * Shared limits and policy constants.
 *
 * Safe to import from both server and client code — no secrets, no Node APIs.
 * Keeping these in one place guarantees the browser-side pre-flight checks and
 * the authoritative server-side checks can never drift apart.
 */

/** Hard upload ceiling enforced on the client, at presign time, and after upload. */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/** Total storage a single account may consume. */
export const USER_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB

/** Longest original filename we will store / echo back. */
export const MAX_FILENAME_LENGTH = 255;

/** Lifetime of a presigned PUT URL. Short: the client uses it immediately. */
export const UPLOAD_URL_TTL_SECONDS = 5 * 60; // 5 minutes

/** Lifetime of a presigned GET URL handed to an authorised downloader. */
export const DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Session lifetime for the signed JWT and its httpOnly cookie. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Extensions that are never accepted regardless of the declared MIME type.
 *
 * The bucket is private and files are only ever served through presigned URLs
 * with `Content-Disposition: attachment`, so these cannot execute server-side.
 * Blocking them anyway keeps the service from being used as a malware host
 * (OWASP "File Upload Cheat Sheet" — unrestricted file upload).
 */
export const BLOCKED_FILE_EXTENSIONS = [
  "app",
  "bat",
  "cgi",
  "cmd",
  "com",
  "cpl",
  "dll",
  "exe",
  "hta",
  "jar",
  "js",
  "jse",
  "lnk",
  "msc",
  "msi",
  "msp",
  "php",
  "pif",
  "ps1",
  "reg",
  "scr",
  "sh",
  "vb",
  "vbe",
  "vbs",
  "wsf",
  "wsh",
] as const;

/** Fallback content type when the client sends nothing usable. */
export const DEFAULT_MIME_TYPE = "application/octet-stream";

/** Coarse buckets used for dashboard filtering. */
export const FILE_CATEGORIES = [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "other",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

/** Maps a MIME type onto a dashboard category. */
export function categorizeMimeType(mimeType: string): FileCategory {
  const type = mimeType.toLowerCase();

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";

  if (
    type.startsWith("text/") ||
    type === "application/pdf" ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    type.includes("presentation") ||
    type.includes("powerpoint") ||
    type === "application/json" ||
    type === "application/xml"
  ) {
    return "document";
  }

  if (
    type.includes("zip") ||
    type.includes("tar") ||
    type.includes("rar") ||
    type.includes("7z") ||
    type.includes("gzip") ||
    type.includes("compressed")
  ) {
    return "archive";
  }

  return "other";
}

/** Human readable byte size, e.g. `104857600` -> `100 MB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
