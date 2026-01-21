"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useIsPlatformAdmin } from "@/entities/me/model/store";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";

/**
 * PlatformAdminGuard component
 *
 * Client-side guard that checks if the user is a platform admin
 * and redirects to /dashboard if they are not.
 *
 * This ensures that only platform admins can access protected routes.
 */
export function PlatformAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isPlatformAdmin = useIsPlatformAdmin();
  const { isLoading } = useCurrentUser();

  useEffect(() => {
    // Don't check on public routes or while loading
    const isPublicRoute =
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname === "/welcome" ||
      pathname === "/logout" ||
      pathname === "/dashboard" ||
      pathname.startsWith("/courses");

    if (isPublicRoute || isLoading) {
      return;
    }

    // If user is not a platform admin, redirect to dashboard
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [isPlatformAdmin, pathname, router, isLoading]);

  return null;
}
