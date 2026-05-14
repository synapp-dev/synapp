import Link from "next/link";

import { cn } from "@workspace/ui/lib/utils";
import { Separator } from "@workspace/ui/components/separator";

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

/** Single-row grenade + side filters (tab-group styling, URL-driven). */
export function UtilityMapFiltersBar({
  mapSlug,
  filters,
}: {
  mapSlug: string;
  filters: UtilitySearchFilters;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1 md:gap-5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <span className="text-muted-foreground w-14 shrink-0 text-xs font-medium uppercase md:w-16">
          Grenade
        </span>
        <div
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-lg p-[3px]"
          role="tablist"
          aria-label="Grenade type"
        >
          {GRENADE_FILTERS.map(({ key, label }) => {
            const href = buildUtilityMapHref(mapSlug, { ...filters, grenadeType: key });
            const active = filters.grenadeType === key;
            return (
              <Link
                key={key}
                href={href}
                scroll={false}
                role="tab"
                aria-selected={active}
                className={cn(
                  "inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1 md:px-3",
                  active
                    ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <Separator orientation="vertical" className="hidden h-7 shrink-0 md:block" aria-hidden />

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <span className="text-muted-foreground w-9 shrink-0 text-xs font-medium uppercase md:w-10">
          Side
        </span>
        <div
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-lg p-[3px]"
          role="tablist"
          aria-label="Side"
        >
          {SIDE_FILTERS.map(({ key, label }) => {
            const href = buildUtilityMapHref(mapSlug, { ...filters, side: key });
            const active = filters.side === key;
            return (
              <Link
                key={key}
                href={href}
                scroll={false}
                role="tab"
                aria-selected={active}
                className={cn(
                  "inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1",
                  active
                    ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
