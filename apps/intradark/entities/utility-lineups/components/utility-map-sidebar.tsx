import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { buildUtilityMapHref } from "@/entities/utility-lineups/lib/build-utility-map-href";
import type { UtilitySearchFilters } from "@/entities/utility-lineups/lib/types";

const GRENADE_FILTERS: { key: UtilitySearchFilters["grenadeType"]; label: string }[] =
  [
    { key: "all", label: "All" },
    { key: "smoke", label: "Smokes" },
    { key: "molotov", label: "Molotovs" },
    { key: "flashbang", label: "Flashbangs" },
    { key: "he", label: "HE" },
  ];

const SIDE_FILTERS: { key: UtilitySearchFilters["side"]; label: string }[] = [
  { key: "any", label: "Any" },
  { key: "t", label: "T" },
  { key: "ct", label: "CT" },
];

export function UtilityMapSidebar({
  mapSlug,
  displayName,
  filters,
}: {
  mapSlug: string;
  displayName: string;
  filters: UtilitySearchFilters;
}) {
  return (
    <aside className="bg-card text-card-foreground border-border flex flex-col gap-6 rounded-lg border p-4 lg:max-w-[280px]">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{displayName}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Filter lineups, then tap a marker on the radar.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          Grenade
        </p>
        <div className="flex flex-col gap-1">
          {GRENADE_FILTERS.map(({ key, label }) => {
            const href = buildUtilityMapHref(mapSlug, { ...filters, grenadeType: key });
            const active = filters.grenadeType === key;
            return (
              <Button
                key={key}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn("justify-start", active && "font-medium")}
                size="sm"
              >
                <Link href={href}>{label}</Link>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium uppercase">Side</p>
        <div className="flex flex-wrap gap-1">
          {SIDE_FILTERS.map(({ key, label }) => {
            const href = buildUtilityMapHref(mapSlug, { ...filters, side: key });
            const active = filters.side === key;
            return (
              <Button
                key={key}
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
              >
                <Link href={href}>{label}</Link>
              </Button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
