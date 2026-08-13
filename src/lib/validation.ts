import { z } from "zod";

import {
  FILE_CATEGORIES,
  formatBytes,
  MAX_FILE_SIZE_BYTES,
  MAX_FILENAME_LENGTH,
} from "@/lib/constants";

/**
 * Request schemas shared by the API routes and the forms that call them.
 *
 * Client-side only for instant feedback; the server re-parses every payload
 * because anything reaching a route handler is untrusted input.
 */

/** Lower-cased and trimmed so `Foo@Bar.com` and `foo@bar.com` are one account. */
export const emailSchema = z
  .email({ message: "Enter a valid email address." })
  .max(254, "Email address is too long.")
  .transform((value) => value.trim().toLowerCase());

/**
 * Length carries most of the entropy, so the floor is 8 with a mixed-content
 * requirement rather than a thicket of character-class rules that push users
 * toward `Password1!`. The 72-byte ceiling is bcrypt's own input limit —
 * anything beyond it is silently ignored by the algorithm.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    message: "Password must contain at least one letter and one number.",
  });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // No strength rules here: an existing password must be accepted as-is, and
  // rejecting it early would leak which passwords could possibly be valid.
  password: z.string().min(1, "Password is required.").max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/*  Files                                                                      */
/* -------------------------------------------------------------------------- */

const filenameSchema = z
  .string()
  .min(1, "Filename is required.")
  .max(MAX_FILENAME_LENGTH, "Filename is too long.");

export const uploadUrlSchema = z.object({
  filename: filenameSchema,
  // Bounds are re-checked against the size S3 reports, but rejecting an
  // impossible request here avoids minting a presigned URL for it at all.
  fileSize: z
    .number()
    .int("File size must be a whole number of bytes.")
    .positive("File is empty.")
    .max(
      MAX_FILE_SIZE_BYTES,
      `File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`,
    ),
  // `type/subtype` with optional parameters. Anything else falls back to the
  // generic binary type rather than being signed into the URL verbatim.
  mimeType: z
    .string()
    .regex(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(;.*)?$/i, "Invalid file type.")
    .max(255)
    .optional(),
});

export const confirmUploadSchema = z.object({
  uploadToken: z.string().min(1, "Upload token is required."),
});

export const visibilitySchema = z.object({
  isPublic: z.boolean(),
});

export const FILE_SORT_FIELDS = ["createdAt", "filename", "fileSize"] as const;

/**
 * Dashboard list query.
 *
 * Parsed from `URLSearchParams`, so every value arrives as a string and is
 * coerced here. Unknown or malformed values fall back to a sane default instead
 * of failing the request — a bad `?sort=` should not break the page.
 */
export const listFilesQuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  category: z.enum(FILE_CATEGORIES).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  sort: z.enum(FILE_SORT_FIELDS).catch("createdAt"),
  order: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type VisibilityInput = z.infer<typeof visibilitySchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
