"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { DashboardTutorialDialog } from "./dashboard-tutorial-dialog";
import { useEffectiveUser } from "@/hooks/use-effective-user";

/**
 * DashboardTutorialGuard component
 *
 * Client-side guard that checks if the dashboard tutorial dialog should be shown.
 * Shows the dialog if:
 * - User is on /dashboard path
 * - Welcome tutorial is completed
 * - Dashboard dialog hasn't been dismissed
 */
export function DashboardTutorialGuard() {
  const pathname = usePathname();
  const currentUser = useEffectiveUser();
  const { isLoading } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if welcome tutorial is completed
  const isWelcomeCompleted = useMemo(() => {
    if (!currentUser?.metadata) return false;
    const metadata = currentUser.metadata as any;
    return metadata?.tutorials?.welcome?.completed === true;
  }, [currentUser]);

  // Check if we're on the dashboard
  const isOnDashboard = pathname === "/dashboard";

  useEffect(() => {
    // Don't check while loading
    if (isLoading) {
      return;
    }

    // If user is not loaded yet, wait
    if (!currentUser) {
      return;
    }

    // Only check if on dashboard
    if (!isOnDashboard) {
      return;
    }

    // Don't show dialog if welcome tutorial is not completed
    if (!isWelcomeCompleted) {
      return;
    }

    // Check if dialog has been dismissed
    const metadata = (currentUser.metadata as any) || {};
    const isDialogDismissed =
      metadata?.dialogs?.dashboard?.dismissed === true;

    // Show dialog if it hasn't been dismissed
    if (!isDialogDismissed) {
      setDialogOpen(true);
    }
  }, [
    currentUser,
    isLoading,
    isOnDashboard,
    isWelcomeCompleted,
  ]);

  // Don't render dialog if not on dashboard
  if (!isOnDashboard) {
    return null;
  }

  // Don't render dialog if welcome tutorial is not completed
  if (!isWelcomeCompleted) {
    return null;
  }

  return (
    <DashboardTutorialDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  );
}
