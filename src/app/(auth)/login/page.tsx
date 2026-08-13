import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to reach your files.
        </p>
      </header>

      <AuthForm mode="login" />
    </>
  );
}
