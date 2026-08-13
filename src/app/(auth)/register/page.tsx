import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted">
          1 GB of private storage, free.
        </p>
      </header>

      <AuthForm mode="register" />
    </>
  );
}
