"use client";

import { AlertCircle, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, toApiClientError } from "@/lib/api-client";
import { loginSchema, registerSchema } from "@/lib/validation";

/**
 * Sign-in and sign-up share one component: the fields, the error handling and
 * the redirect are identical, and only the schema, the copy and the endpoint
 * differ. Splitting them would duplicate every piece that actually matters.
 *
 * The same Zod schemas the API uses validate here too, so the rules the user
 * sees are the rules the server enforces — they cannot drift.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const schema = isRegister ? registerSchema : loginSchema;
    const parsed = schema.safeParse({ email, password });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        await authApi.register(parsed.data.email, parsed.data.password);
      } else {
        await authApi.login(parsed.data.email, parsed.data.password);
      }

      // `refresh()` re-runs the server components so the proxy and the
      // dashboard both see the cookie that was just set.
      router.replace(getRedirectTarget());
      router.refresh();
    } catch (error) {
      const apiError = toApiClientError(error);

      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      }

      setFormError(apiError.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        icon={<Mail className="size-4" />}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
        disabled={submitting}
        required
      />

      <Input
        label="Password"
        type="password"
        name="password"
        // Tells the browser's password manager whether to offer a saved
        // password or to suggest a new one.
        autoComplete={isRegister ? "new-password" : "current-password"}
        placeholder={isRegister ? "At least 8 characters" : "••••••••"}
        icon={<KeyRound className="size-4" />}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        hint={
          isRegister && !fieldErrors.password
            ? "Must contain at least one letter and one number."
            : undefined
        }
        disabled={submitting}
        required
      />

      <Button type="submit" loading={submitting} className="mt-2 w-full">
        {isRegister ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-primary hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

/**
 * Where to land after authenticating.
 *
 * The proxy puts the blocked destination in `?next=`. Only same-origin relative
 * paths are honoured — echoing an arbitrary URL back into a redirect is a
 * textbook open-redirect, and a login page is exactly where phishing looks for
 * one.
 */
function getRedirectTarget(): string {
  if (typeof window === "undefined") return "/dashboard";

  const next = new URLSearchParams(window.location.search).get("next");

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return "/dashboard";
}
