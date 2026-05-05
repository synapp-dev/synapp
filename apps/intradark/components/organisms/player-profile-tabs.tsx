"use client";

import { Activity, Map, Trophy, User } from "lucide-react";

import { PlayerProfileFormPanel } from "@/components/organisms/player-profile/player-profile-form-panel";
import { PlayerProfileMapsPanel } from "@/components/organisms/player-profile/player-profile-maps-panel";
import { PlayerProfileMatchesPanel } from "@/components/organisms/player-profile/player-profile-matches-panel";
import { PlayerProfileMediaPanel } from "@/components/organisms/player-profile/player-profile-media-panel";
import { PlayerProfileTeammatesPanel } from "@/components/organisms/player-profile/player-profile-teammates-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

const tabTriggerClass =
  "rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-white/55 shadow-none transition-colors hover:text-white/85 data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none";

export type PlayerProfileTabsProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileTabs({ playerId, className }: PlayerProfileTabsProps) {
  return (
    <section
      className={cn("w-full max-w-none", className)}
      aria-label="Player profile sections"
    >
      <Tabs defaultValue="overview" className="w-full max-w-none gap-0">
        <TabsList className="mb-0 h-auto w-full min-w-0 flex-wrap justify-start gap-0 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none">
          <TabsTrigger value="overview" className={cn("gap-1.5", tabTriggerClass)}>
            <User className="size-4 shrink-0" aria-hidden />
            Overview
          </TabsTrigger>
          <TabsTrigger value="form" className={cn("gap-1.5", tabTriggerClass)}>
            <Activity className="size-4 shrink-0" aria-hidden />
            Form
          </TabsTrigger>
          <TabsTrigger value="maps" className={cn("gap-1.5", tabTriggerClass)}>
            <Map className="size-4 shrink-0" aria-hidden />
            Maps
          </TabsTrigger>
          <TabsTrigger value="matches" className={cn("gap-1.5", tabTriggerClass)}>
            <Trophy className="size-4 shrink-0" aria-hidden />
            Matches
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="mt-0 w-full max-w-none pt-5 outline-none"
        >
          <div className="flex w-full max-w-none flex-col gap-10">
            <PlayerProfileTeammatesPanel playerId={playerId} />
            <PlayerProfileMediaPanel playerId={playerId} />
          </div>
        </TabsContent>
        <TabsContent
          value="form"
          className="mt-0 w-full max-w-none pt-5 outline-none"
        >
          <PlayerProfileFormPanel playerId={playerId} />
        </TabsContent>
        <TabsContent
          value="maps"
          className="mt-0 w-full max-w-none pt-5 outline-none"
        >
          <PlayerProfileMapsPanel playerId={playerId} />
        </TabsContent>
        <TabsContent
          value="matches"
          className="mt-0 w-full max-w-none pt-5 outline-none"
        >
          <PlayerProfileMatchesPanel playerId={playerId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
