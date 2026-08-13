import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();

  // The layout already redirects; this narrows the type and keeps the page
  // correct on its own terms rather than relying on a parent's side effect.
  if (!session) {
    redirect("/login?next=/dashboard");
  }

  return <DashboardView email={session.email} />;
}
