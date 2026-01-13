import Image from "next/image";
import { Badge } from "@workspace/ui/components/badge";
import type { School } from "./schools-table-columns";

interface SchoolDetailHeaderProps {
  school: School | null;
}

// Helper function to format school sector
function formatSector(sector: string | null | undefined): string {
  if (!sector) return "—";
  if (sector === "government") return "Government";
  if (sector === "catholic") return "Catholic";
  if (sector === "independent") return "Independent";
  return sector;
}

// Helper function to format school levels
function formatSchoolLevel(levels: string[] | null | undefined): string {
  if (!levels || levels.length === 0) {
    return "—";
  }

  // Filter out null/undefined/non-string values and normalize level names to lowercase for comparison
  const normalizedLevels = levels
    .filter(
      (level): level is string => typeof level === "string" && level != null
    )
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
}

export function SchoolDetailHeader({ school }: SchoolDetailHeaderProps) {
  if (!school) return null;

  const sectorDisplay = formatSector(school.sector);
  const levelDisplay = formatSchoolLevel(school.levels);

  return (
    <div className="p-4 bg-muted shrink-0">
      <div className="flex items-center gap-4">
        {/* Bullyproof Logo */}
        <Image
          src="/images/bullyproof-logo.svg"
          alt="Bullyproof Logo"
          width={120}
          height={32}
          className="h-8 w-auto"
        />

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Name and Badges in Flex Column */}
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-xl truncate">{school.name}</h2>
          <div className="flex flex-wrap gap-2">
            {school.state && (
              <Badge variant="secondary" className="w-fit">
                {school.state.toUpperCase()}
              </Badge>
            )}
            {sectorDisplay !== "—" && (
              <Badge variant="secondary" className="w-fit">
                {sectorDisplay}
              </Badge>
            )}
            {levelDisplay !== "—" && (
              <Badge variant="secondary" className="w-fit">
                {levelDisplay}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
