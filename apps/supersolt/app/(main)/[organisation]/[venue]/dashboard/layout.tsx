import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCachedDashboardBootstrap } from "@/server/dashboard/get-cached-dashboard-bootstrap";

export default async function ScopedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const bootstrap = await getCachedDashboardBootstrap();

  if (bootstrap.kind === "unauthenticated") {
    redirect("/auth");
  }

  if (bootstrap.kind === "error") {
    redirect("/auth");
  }

  if (bootstrap.access.organisations.length === 0) {
    redirect("/setup");
  }

  return children;
}
