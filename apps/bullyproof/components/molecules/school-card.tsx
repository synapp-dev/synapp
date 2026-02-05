"use client";

import { useEffect, useState } from "react";
import { useSchoolStore } from "@/stores/school-store";
import Image from "next/image";

export function SchoolCard() {
  const [mounted, setMounted] = useState(false);
  const currentSchool = useSchoolStore((state) => state.currentSchool);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted on client to avoid SSR hydration issues
  if (!mounted) {
    return (
      <div className="mb-4">
        <div className="text-xl font-extrabold flex items-center gap-2">
          Loading school...
        </div>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <div className="mb-4">
        <div className="text-xl font-extrabold flex items-center gap-2">
          Loading school...
        </div>
      </div>
    );
  }

  // Helper function to format school levels
  const formatSchoolLevel = (levels: string[] | null | undefined): string => {
    if (!levels || levels.length === 0) {
      return "—";
    }

    // Filter out null/undefined/non-string values and normalize level names to lowercase for comparison
    const normalizedLevels = levels
      .filter((level): level is string => typeof level === "string" && level != null)
      .map((level) => level.toLowerCase().trim())
      .filter((level) => level.length > 0); // Remove empty strings after trimming

    if (normalizedLevels.length === 0) {
      return "—";
    }

    const hasPrimary = normalizedLevels.some(
      (level) => level === "primary" || level.includes("primary")
    );
    const hasSecondary = normalizedLevels.some(
      (level) => level === "secondary" || level.includes("secondary")
    );

    if (hasPrimary && hasSecondary) {
      return "P-12";
    } else if (hasPrimary) {
      return "Primary";
    } else if (hasSecondary) {
      return "Secondary";
    }

    // Fallback: return first level capitalized
    const firstLevel = normalizedLevels[0];
    return firstLevel
      ? firstLevel.charAt(0).toUpperCase() + firstLevel.slice(1).toLowerCase()
      : "—";
  };

  const formatSector = (sector: string | null | undefined): string => {
    if (!sector) return "—";
    return sector === "government"
      ? "Government"
      : sector === "catholic"
        ? "Catholic"
        : "Independent";
  };

  return (
    <div className="mb-4">
      <div className="flex flex-row items-center gap-3 flex-wrap">
        <div className="text-xl font-extrabold flex items-center gap-2">
          {currentSchool.avatarUrl && (
            <Image
              src={currentSchool.avatarUrl}
              alt={currentSchool.name || "School"}
              width={100}
              height={100}
              className="w-10 h-auto"
            />
          )}
          {currentSchool.name || "Loading..."}
        </div>
        {currentSchool.state && typeof currentSchool.state === "string" && (
          <span className="text-sm text-muted-foreground">
            {currentSchool.state.toUpperCase()}
          </span>
        )}
        {currentSchool.sector && (
          <span className="text-sm text-muted-foreground">
            {formatSector(currentSchool.sector)}
          </span>
        )}
        {((currentSchool as { levelBadge?: string | null }).levelBadge || (currentSchool.levels && currentSchool.levels.length > 0)) && (
          <span className="text-sm text-muted-foreground">
            {(currentSchool as { levelBadge?: string | null }).levelBadge ?? formatSchoolLevel(currentSchool.levels)}
          </span>
        )}
      </div>
    </div>
  );
}
