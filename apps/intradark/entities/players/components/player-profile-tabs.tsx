"use client";

import type { ReactNode } from "react";
import { ImageIcon, LayoutDashboard, Trophy } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { ProfileTrustChips } from "@/entities/players/components/profile-trust-chips";
import type { ProfileTrustCounts } from "@/entities/players/lib/profile-comments/queries";

const PROFILE_TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "matches", label: "Matches", icon: Trophy },
  { value: "media", label: "Media", icon: ImageIcon },
] as const;

export type PlayerProfileTab = (typeof PROFILE_TABS)[number]["value"];

export interface PlayerProfileTabsProps {
  value: PlayerProfileTab;
  onValueChange: (value: PlayerProfileTab) => void;
  trustCounts: ProfileTrustCounts;
  overview: ReactNode;
  matches: ReactNode;
  media: ReactNode;
  className?: string;
}

export function PlayerProfileTabs({
  value,
  onValueChange,
  trustCounts,
  overview,
  matches,
  media,
  className,
}: PlayerProfileTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as PlayerProfileTab)}
      className={cn("gap-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label="Player profile sections">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <ProfileTrustChips
          counts={trustCounts}
          onBeforeScroll={() => onValueChange("overview")}
        />
      </div>

      <TabsContent value="overview" className="mt-0 outline-none">
        {overview}
      </TabsContent>
      <TabsContent value="matches" className="mt-0 outline-none">
        {matches}
      </TabsContent>
      <TabsContent value="media" className="mt-0 outline-none">
        {media}
      </TabsContent>
    </Tabs>
  );
}
