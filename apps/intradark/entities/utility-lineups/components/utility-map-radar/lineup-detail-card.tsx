"use client";

import * as React from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

import { AdminDetailsEditBlock } from "@/entities/utility-lineups/components/admin-lineup-details-edit-block";
import { buildYouTubeEmbedSrc } from "@/entities/utility-lineups/lib/youtube-embed";
import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";

import {
  AdminSpotEditBlock,
  AdminTimelineEditBlock,
} from "./admin-edit-blocks";
import type { UtilityClientLineup } from "./types";

/** Avoids blank `<video>` frames when a transformed ancestor (e.g. Sheet) composites in Chrome. */
function StorageLineupVideo({
  src,
  startMs,
  endMs,
}: {
  src: string;
  startMs: number;
  endMs: number | null;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const applyStart = () => {
      if (startMs > 0) {
        v.currentTime = startMs / 1000;
      }
    };

    const onTime = () => {
      if (endMs != null && endMs > startMs) {
        const endS = endMs / 1000;
        if (v.currentTime > endS) {
          v.currentTime = endS;
          v.pause();
        }
      }
    };

    v.addEventListener("loadedmetadata", applyStart);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", applyStart);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [src, startMs, endMs]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md border border-border [transform:translateZ(0)]">
      <video
        ref={ref}
        key={src}
        title="Lineup video"
        src={src}
        className="h-full w-full object-contain [transform:translateZ(0)]"
        controls
        playsInline
        preload="auto"
      />
    </div>
  );
}

export function LineupDetailCard({
  lineup,
  mapSlug,
  radarImageUrl,
  displayName,
  canEditSpots,
  onSpotsSaved,
}: {
  lineup: UtilityClientLineup;
  mapSlug: string;
  radarImageUrl: string;
  displayName: string;
  canEditSpots: boolean;
  onSpotsSaved: () => void;
}) {
  const [editDetailsOpen, setEditDetailsOpen] = React.useState(false);
  const [editSpotsOpen, setEditSpotsOpen] = React.useState(false);
  const [editTimelineOpen, setEditTimelineOpen] = React.useState(false);

  React.useEffect(() => {
    setEditDetailsOpen(false);
    setEditSpotsOpen(false);
    setEditTimelineOpen(false);
  }, [lineup.id]);

  const embedSrc = buildYouTubeEmbedSrc(
    lineup.youtubeUrl,
    lineup.videoStartMs,
    lineup.videoEndMs,
  );
  const storageVideoSrc = lineup.videoObjectPath
    ? intradarkMediaPublicUrl(lineup.videoObjectPath)
    : null;

  const hasStills =
    lineup.stillStandMs != null ||
    lineup.stillThrowMs != null ||
    lineup.stillLandMs != null ||
    lineup.grenadeReleaseMs != null ||
    lineup.grenadeBloomMs != null;

  return (
    <article className="space-y-3">
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

      <Tabs defaultValue="details" className="w-full gap-3">
        <TabsList className={cn("w-full", canEditSpots ? "grid grid-cols-3" : "grid grid-cols-2")}>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          {canEditSpots ? <TabsTrigger value="admin">Admin</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="details" className="space-y-3">
          {hasStills && (
            <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px]">
              {lineup.stillStandMs != null ? (
                <>
                  <dt>Stand still</dt>
                  <dd className="font-mono text-foreground">
                    {(lineup.stillStandMs / 1000).toFixed(1)}s
                  </dd>
                </>
              ) : null}
              {lineup.stillThrowMs != null ? (
                <>
                  <dt>Throw still</dt>
                  <dd className="font-mono text-foreground">
                    {(lineup.stillThrowMs / 1000).toFixed(1)}s
                  </dd>
                </>
              ) : null}
              {lineup.stillLandMs != null ? (
                <>
                  <dt>Land still</dt>
                  <dd className="font-mono text-foreground">
                    {(lineup.stillLandMs / 1000).toFixed(1)}s
                  </dd>
                </>
              ) : null}
              {lineup.grenadeReleaseMs != null ? (
                <>
                  <dt>Released</dt>
                  <dd className="font-mono text-foreground">
                    {(lineup.grenadeReleaseMs / 1000).toFixed(1)}s
                  </dd>
                </>
              ) : null}
              {lineup.grenadeBloomMs != null ? (
                <>
                  <dt>Blooms</dt>
                  <dd className="font-mono text-foreground">
                    {(lineup.grenadeBloomMs / 1000).toFixed(1)}s
                  </dd>
                </>
              ) : null}
            </dl>
          )}
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
        </TabsContent>

        <TabsContent value="video" className="space-y-3">
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
          ) : storageVideoSrc ? (
            <StorageLineupVideo
              src={storageVideoSrc}
              startMs={lineup.videoStartMs}
              endMs={lineup.videoEndMs}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No video for this lineup.
            </p>
          )}
          {lineup.youtubeUrl ? (
            <Button variant="link" className="h-auto px-0" asChild>
              <a href={lineup.youtubeUrl} target="_blank" rel="noopener noreferrer">
                Open on YouTube
              </a>
            </Button>
          ) : null}
        </TabsContent>

        {canEditSpots ? (
          <TabsContent value="admin" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDetailsOpen((o) => !o)}
              >
                {editDetailsOpen ? "Close details editor" : "Edit details"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditSpotsOpen((o) => !o)}
              >
                {editSpotsOpen ? "Close position editor" : "Edit throw & land"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditTimelineOpen((o) => !o)}
              >
                {editTimelineOpen ? "Close timeline editor" : "Edit timeline"}
              </Button>
            </div>
            {editDetailsOpen ? (
              <AdminDetailsEditBlock
                lineup={lineup}
                mapSlug={mapSlug}
                onCancel={() => setEditDetailsOpen(false)}
                onSaved={() => {
                  setEditDetailsOpen(false);
                  onSpotsSaved();
                }}
              />
            ) : null}
            {editTimelineOpen ? (
              <AdminTimelineEditBlock
                lineup={lineup}
                mapSlug={mapSlug}
                onCancel={() => setEditTimelineOpen(false)}
                onSaved={() => {
                  setEditTimelineOpen(false);
                  onSpotsSaved();
                }}
              />
            ) : null}
            {editSpotsOpen ? (
              <AdminSpotEditBlock
                lineup={lineup}
                mapSlug={mapSlug}
                radarImageUrl={radarImageUrl}
                displayName={displayName}
                onCancel={() => setEditSpotsOpen(false)}
                onSaved={() => {
                  setEditSpotsOpen(false);
                  onSpotsSaved();
                }}
              />
            ) : null}
          </TabsContent>
        ) : null}
      </Tabs>
    </article>
  );
}
