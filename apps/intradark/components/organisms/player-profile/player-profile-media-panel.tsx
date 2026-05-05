"use client";

import Image from "next/image";

import { MEDIA_SHOWCASE, type MediaItem } from "@/lib/player-profile-showcase-data";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

const tabListClass =
  "h-auto w-fit gap-1 rounded-full border border-white/15 bg-black/25 p-1";

const tabTriggerClass =
  "rounded-full px-3 py-1.5 text-xs font-medium text-white/60 data-[state=active]:border data-[state=active]:border-primary data-[state=active]:bg-primary/15 data-[state=active]:text-white";

function MediaFrame({ item }: { item: MediaItem | undefined }) {
  if (!item) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/50">
        Nothing here yet
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <Image
        src={item.src}
        alt={item.alt}
        fill
        className="object-cover object-top"
        sizes="(max-width:768px) 100vw, 896px"
      />
      {item.watermark ? (
        <span className="absolute bottom-3 left-3 text-xs font-semibold tracking-wide text-white/70">
          {item.watermark}
        </span>
      ) : null}
    </div>
  );
}

export type PlayerProfileMediaPanelProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileMediaPanel({
  playerId,
  className,
}: PlayerProfileMediaPanelProps) {
  void playerId;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Tabs defaultValue="photos" className="w-full gap-0">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-white">Media</h2>
          <TabsList className={tabListClass}>
            <TabsTrigger value="photos" className={tabTriggerClass}>
              Photos
            </TabsTrigger>
            <TabsTrigger value="videos" className={tabTriggerClass}>
              Videos
            </TabsTrigger>
            <TabsTrigger value="recent" className={tabTriggerClass}>
              Recent
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="photos" className="mt-4 outline-none">
          <MediaFrame item={MEDIA_SHOWCASE.photos[0]} />
        </TabsContent>
        <TabsContent value="videos" className="mt-4 outline-none">
          <MediaFrame item={MEDIA_SHOWCASE.videos[0]} />
        </TabsContent>
        <TabsContent value="recent" className="mt-4 outline-none">
          <MediaFrame item={MEDIA_SHOWCASE.recent[0]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
