"use client";

import { useEffect, useMemo } from "react";
import { generatePageTitle } from "@/utils/metadata";

/**
 * Hook to set page title for client components
 * Usage: usePageTitle(["dashboard"]) or usePageTitle(["schools", "lessons"])
 */
export function usePageTitle(segments: string[]): void {
  const title = useMemo(
    () => generatePageTitle(segments),
    [segments.join(",")]
  );

  useEffect(() => {
    document.title = title;
  }, [title]);
}
