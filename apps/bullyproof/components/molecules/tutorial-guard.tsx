"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useEffectiveUser } from "@/hooks/use-effective-user";

/**
 * TutorialGuard component
 *
 * Client-side guard that checks tutorial completion status from the Zustand store
 * and redirects to /welcome if the welcome tutorial is not completed.
 *
 * This replaces the server-side DB query in middleware which was failing.
 */
export function TutorialGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useEffectiveUser();
  const { isLoading } = useCurrentUser();

  useEffect(() => {
    // Don't check on public routes, welcome page, or while loading
    const isPublicRoute =
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname === "/welcome" ||
      pathname === "/logout";

    if (isPublicRoute || isLoading) {
      return;
    }

    // If user is not loaded yet, wait
    if (!currentUser) {
      return;
    }

    // Check tutorial completion status from store
    const metadata = (currentUser.metadata as any) || {};
    const isWelcomeCompleted = metadata?.tutorials?.welcome?.completed === true;

    // If welcome tutorial is not completed, redirect to welcome page
    if (!isWelcomeCompleted) {
      router.replace("/welcome");
    }
  }, [currentUser, pathname, router, isLoading]);

  return null;
}
