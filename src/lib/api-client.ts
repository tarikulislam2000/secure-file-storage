import axios, { AxiosError, type AxiosProgressEvent } from "axios";

import type {
  ApiErrorBody,
  AuthUser,
  DownloadResponse,
  FileListResponse,
  SerializedFile,
  UploadUrlResponse,
} from "@/lib/types";

/**
 * Browser-side API client.
 *
 * One place that knows how to talk to our routes, so components deal in
 * domain calls (`files.list`, `auth.login`) and never in URLs or error shapes.
 */

const client = axios.create({
  baseURL: "/api",
  // The session lives in an httpOnly cookie; the browser attaches it for us.
  withCredentials: true,
});

/** A failure that already carries a message worth showing to the user. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  /** Field-keyed validation messages, for binding to form inputs. */
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    code: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Turns anything axios throws into an `ApiClientError`.
 *
 * Our routes always answer with the same envelope, so the message shown to the
 * user comes from the server whenever there was a response at all. A request
 * that never reached us (offline, DNS, timeout) gets a message that says so,
 * rather than a bare "Network Error".
 */
export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const body = axiosError.response?.data;

    if (body?.error) {
      return new ApiClientError(
        body.error.message,
        body.error.code,
        axiosError.response?.status ?? 500,
        body.error.details,
      );
    }

    if (axiosError.code === "ERR_CANCELED") {
      return new ApiClientError("Upload cancelled.", "CANCELLED", 0);
    }

    if (!axiosError.response) {
      return new ApiClientError(
        "Cannot reach the server. Check your connection and try again.",
        "NETWORK_ERROR",
        0,
      );
    }
  }

  return new ApiClientError(
    "Something went wrong. Please try again.",
    "UNKNOWN",
    500,
  );
}

/** Wraps a call so every rejection is an `ApiClientError`. */
async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export const authApi = {
  register: (email: string, password: string) =>
    request<{ user: AuthUser }>(() =>
      client.post("/auth/register", { email, password }),
    ),

  login: (email: string, password: string) =>
    request<{ user: AuthUser }>(() =>
      client.post("/auth/login", { email, password }),
    ),

  logout: () => request<{ success: boolean }>(() => client.post("/auth/logout")),

  me: () => request<{ user: AuthUser }>(() => client.get("/auth/me")),
};

export interface FileListParams {
  q?: string;
  category?: string;
  visibility?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export const filesApi = {
  list: (params: FileListParams, signal?: AbortSignal) =>
    request<FileListResponse>(() =>
      client.get("/files", {
        // Drop empty values so the URL reflects only the active filters.
        params: Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== "",
          ),
        ),
        signal,
      }),
    ),

  requestUploadUrl: (input: {
    filename: string;
    fileSize: number;
    mimeType?: string;
  }) => request<UploadUrlResponse>(() => client.post("/files/upload-url", input)),

  confirm: (uploadToken: string) =>
    request<{ file: SerializedFile }>(() =>
      client.post("/files/confirm", { uploadToken }),
    ),

  download: (id: string) =>
    request<DownloadResponse>(() => client.get(`/files/${id}/download`)),

  setVisibility: (id: string, isPublic: boolean) =>
    request<{ file: SerializedFile }>(() =>
      client.patch(`/files/${id}/visibility`, { isPublic }),
    ),

  remove: (id: string) =>
    request<{ success: boolean; id: string }>(() => client.delete(`/files/${id}`)),
};

/**
 * Streams a file straight to S3 with the presigned URL.
 *
 * Deliberately *not* on the `client` instance: this request goes to AWS, not to
 * us, and must carry no cookies or `baseURL`. `onUploadProgress` is the reason
 * axios is used here at all — `fetch` still cannot report upload progress.
 */
export async function uploadToS3(options: {
  url: string;
  file: File;
  contentType: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  try {
    await axios.put(options.url, options.file, {
      headers: { "Content-Type": options.contentType },
      signal: options.signal,
      // 100 MB over a slow connection legitimately takes minutes.
      timeout: 0,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!options.onProgress) return;

        const total = event.total ?? options.file.size;
        if (!total) return;

        options.onProgress(
          Math.min(100, Math.round((event.loaded / total) * 100)),
        );
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
      throw new ApiClientError("Upload cancelled.", "CANCELLED", 0);
    }

    // S3 answers with XML, not our JSON envelope, so there is nothing useful to
    // forward to the user beyond the fact that the transfer itself failed.
    throw new ApiClientError(
      "The transfer to storage failed. Please try again.",
      "UPLOAD_FAILED",
      0,
    );
  }
}
