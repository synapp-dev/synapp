"use client";

import { useIsPlatformAdmin } from "@/entities/me/model/store";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";

/**
 * PlatformAdminGuard component
 *
 * Client-side guard that checks if the user is a platform admin.
 * This component no longer redirects - it simply performs the access check
 * and allows users with access to view the page.
 */
export function PlatformAdminGuard() {
  const isPlatformAdmin = useIsPlatformAdmin();
  const { isLoading } = useCurrentUser();

  // Debug logging
  console.log("[PlatformAdminGuard]:", {
    isPlatformAdmin,
    isLoading,
  });

  // No redirect - users with access can view the page
  return null;
}
