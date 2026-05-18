import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import {
  getStaffDashboardRedirectPath,
  userCanAccessDashboard,
} from "@/server/dashboard/dashboard-access-policy";
import { getCachedDashboardBootstrap } from "@/server/dashboard/get-cached-dashboard-bootstrap";

export default async function DashboardLayout({
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

  if (!userCanAccessDashboard(bootstrap.access)) {
    redirect(getStaffDashboardRedirectPath(bootstrap.access));
  }

  return children;
}
