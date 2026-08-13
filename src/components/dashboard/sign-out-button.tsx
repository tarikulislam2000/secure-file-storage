"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await authApi.logout();
    } finally {
      // Leave regardless: if the request failed the cookie may still be set,
      // and the server-side guard will send them back here if it is.
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      loading={signingOut}
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
