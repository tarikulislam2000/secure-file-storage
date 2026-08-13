import { z } from "zod";

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
