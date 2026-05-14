"use client";

import { useMemo } from "react";

import { UtilityMapCard } from "@/entities/utility-lineups/components/utility-map-card";
import { UtilityMapCardsGrid } from "@/entities/utility-lineups/components/utility-map-cards-grid";
import { groupMapsByUtilityPool } from "@/entities/utility-lineups/lib/utility-map-pool-groups";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import type { UtilityMapListItem } from "./utility-map-list-model";

export type { UtilityMapListItem };

export function UtilityMapList({ maps }: { maps: UtilityMapListItem[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const sectionsWithStagger = useMemo(() => {
    const sections = groupMapsByUtilityPool(maps);
    let i = 0;
    return sections.map((section) => ({
      ...section,
      mapsWithIndex: section.maps.map((m) => ({ m, staggerIndex: i++ })),
    }));
  }, [maps]);

  if (maps.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-lg border border-dashed py-12 text-center">
        No maps in the utility catalog yet. Check back after we publish radar
        data.
      </p>
    );
  }

  return (
    <div className="space-y-20">
      {sectionsWithStagger.map(
        ({ poolSlug, heading, mapsWithIndex }) => (
          <section key={poolSlug} aria-labelledby={`utility-pool-${poolSlug}`}>
            <h2
              id={`utility-pool-${poolSlug}`}
              className="text-foreground mb-4 text-lg font-semibold tracking-tight"
            >
              {heading}
            </h2>
            <UtilityMapCardsGrid variant="catalog">
              {mapsWithIndex.map(({ m, staggerIndex }) => (
                <UtilityMapCard
                  key={m.slug}
                  m={m}
                  staggerIndex={staggerIndex}
                  staggerReducedMotion={prefersReducedMotion}
                />
              ))}
            </UtilityMapCardsGrid>
          </section>
        ),
      )}
    </div>
  );
}
