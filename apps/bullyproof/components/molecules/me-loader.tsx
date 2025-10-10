"use client";

import { useCurrentUser } from "@/entities/me/api/getCurrentUser";

export function MeLoader() {
  const { data: currentUser, error } = useCurrentUser();

  if (error) {
    console.error("Error loading user profile:", error);
  }

  if (currentUser) {
    console.log("User loaded at MeLoader:", currentUser);
  }

  // The useCurrentUser hook automatically populates the me store
  // No need for manual loading logic - React Query handles it
  return null;
}
