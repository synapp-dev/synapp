"use client";

import { MeLoader } from "@/components/molecules/me-loader";

// Backward-compatible alias for projects still importing UserProfileLoader.
export function UserProfileLoader() {
  return <MeLoader />;
}
