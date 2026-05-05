"use client";

import * as React from "react";
import { track } from "@vercel/analytics/react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";

import { buildYouTubeEmbedSrc } from "@/entities/utility-lineups/lib/youtube-embed";

export type UtilityClientLineup = {
  id: string;
  grenadeType: string;
  side: string;
  description: string;
  youtubeUrl: string;
  videoStartMs: number;
  videoEndMs: number | null;
  lineupImageUrl: string | null;
  setposText: string | null;
  throwLabel: string;
  landLabel: string;
  intradarkVerified: boolean;
  proVerified: boolean;
};

export type UtilityClientCluster = {
  landSpotId: string;
  count: number;
  lineupIds: string[];
  radarX: number;
  radarY: number;
  label: string;
};

export function UtilityMapRadarClient({
  mapSlug,
  displayName,
  radarImageUrl,
  clusters,
  lineupsById,
  filters,
}: {
  mapSlug: string;
  displayName: string;
  radarImageUrl: string;
  clusters: UtilityClientCluster[];
  lineupsById: Record<string, UtilityClientLineup>;
  filters: { grenadeType: string; side: string };
}) {
  const [open, setOpen] = React.useState(false);
  const [activeLineupIds, setActiveLineupIds] = React.useState<string[]>([]);
  const [sheetTitle, setSheetTitle] = React.useState("");

  const openCluster = React.useCallback(
    (cluster: UtilityClientCluster) => {
      setActiveLineupIds(cluster.lineupIds);
      setSheetTitle(
        cluster.count > 1
          ? `${cluster.label} · ${cluster.count} lineups`
          : `${cluster.label}`,
      );
      setOpen(true);
      const firstId = cluster.lineupIds[0];
      if (firstId) {
        void track("utility_lineup_open", {
          map_slug: mapSlug,
          lineup_id: firstId,
          grenade_type: filters.grenadeType,
          side: filters.side,
        });
      }
    },
    [filters.grenadeType, filters.side, mapSlug],
  );

  return (
    <>
      <div className="bg-background relative mx-auto aspect-square w-full max-h-[min(70vh,720px)] max-w-[720px] overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary HTTPS radar URLs */}
        <img
          src={radarImageUrl}
          alt={`${displayName} radar`}
          className="absolute inset-0 m-auto h-full w-full object-contain"
        />

        {clusters.map((c) => (
          <button
            key={c.landSpotId}
            type="button"
            className="border-background absolute z-10 flex min-h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 bg-amber-100/95 text-sm font-semibold text-zinc-900 shadow-md transition hover:bg-amber-50"
            style={{
              left: `${c.radarX * 100}%`,
              top: `${c.radarY * 100}%`,
            }}
            onClick={() => openCluster(c)}
            aria-label={`${c.label}, ${c.count} lineup${c.count === 1 ? "" : "s"}`}
          >
            {c.count}
          </button>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-border shrink-0 border-b p-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              Lineup details for {displayName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex max-h-[calc(100vh-5rem)] flex-col gap-4 overflow-y-auto p-4">
            {activeLineupIds.map((id) => {
              const row = lineupsById[id];
              if (!row) return null;
              return <LineupDetailCard key={id} lineup={row} />;
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LineupDetailCard({ lineup }: { lineup: UtilityClientLineup }) {
  const embedSrc = buildYouTubeEmbedSrc(
    lineup.youtubeUrl,
    lineup.videoStartMs,
    lineup.videoEndMs,
  );

  return (
    <article className="border-border space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{lineup.grenadeType}</Badge>
        <Badge variant="outline">{lineup.side}</Badge>
        {lineup.intradarkVerified ? (
          <Badge variant="default">Intradark</Badge>
        ) : null}
        {lineup.proVerified ? <Badge variant="default">Pro</Badge> : null}
      </div>
      <p className="text-muted-foreground text-xs">
        From <span className="text-foreground">{lineup.throwLabel}</span> →{" "}
        <span className="text-foreground">{lineup.landLabel}</span>
      </p>
      <p className="text-sm whitespace-pre-wrap">{lineup.description}</p>
      {lineup.setposText ? (
        <pre className="bg-muted max-h-24 overflow-x-auto rounded-md p-2 text-xs">
          {lineup.setposText}
        </pre>
      ) : null}
      {lineup.lineupImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lineup.lineupImageUrl}
          alt="Lineup reference"
          className="w-full rounded-md border border-border"
        />
      ) : null}
      {embedSrc ? (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
          <iframe
            title="Lineup video"
            src={embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Video URL not supported.</p>
      )}
      <Button variant="link" className="h-auto px-0" asChild>
        <a href={lineup.youtubeUrl} target="_blank" rel="noopener noreferrer">
          Open on YouTube
        </a>
      </Button>
    </article>
  );
}
