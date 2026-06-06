"use client";

import { UtilityMapCard } from "@/entities/utility-lineups/components/utility-map-card";
import { UtilityMapCardsGrid } from "@/entities/utility-lineups/components/utility-map-cards-grid";

import { useUploadWizard } from "../upload-wizard-context";

export function ChooseMapStep() {
  const {
    mapPickerSectionsWithStagger,
    selectedMapSlug,
    setSelectedMapSlug,
    prefersReducedMotion,
  } = useUploadWizard();

  return (
    <div className="space-y-12">
      {mapPickerSectionsWithStagger.map(
        ({ poolSlug, heading, mapsWithIndex }) => (
          <section
            key={poolSlug}
            className="space-y-2"
            aria-labelledby={`upload-map-pool-${poolSlug}`}
          >
            <h3
              id={`upload-map-pool-${poolSlug}`}
              className="text-foreground text-sm font-semibold tracking-tight"
            >
              {heading}
            </h3>
            <UtilityMapCardsGrid variant="picker">
              {mapsWithIndex.map(({ m, staggerIndex }) => {
                const selected = selectedMapSlug === m.slug;
                const hasPick = selectedMapSlug != null;
                return (
                  <UtilityMapCard
                    key={m.id}
                    size="sm"
                    borderless
                    m={{
                      slug: m.slug,
                      displayName: m.displayName,
                      badgeImageUrl: m.badgeImageUrl,
                      mapScreenshotUrl: m.mapScreenshotUrl,
                    }}
                    selectable
                    selected={selected}
                    dimmedUnselected={hasPick && !selected}
                    staggerIndex={staggerIndex}
                    staggerReducedMotion={prefersReducedMotion}
                    onSelect={() =>
                      setSelectedMapSlug((cur) =>
                        cur === m.slug ? null : m.slug,
                      )
                    }
                  />
                );
              })}
            </UtilityMapCardsGrid>
          </section>
        ),
      )}
    </div>
  );
}
