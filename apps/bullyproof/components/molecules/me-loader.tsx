"use client";

import { useCurrentUser } from "@/entities/me/api/getCurrentUser";

export function MeLoader() {
  const { error } = useCurrentUser();

  if (error) {
    console.error("Error loading user profile:", error);
  }

  // The useCurrentUser hook automatically populates the me store
  // No need for manual loading logic - React Query handles it
  return null;
}
