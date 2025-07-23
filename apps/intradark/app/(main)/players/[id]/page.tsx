"use client";

import { useParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle, Users } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { SteamCard } from "@/components/organisms/steam-card";
import { LeetifyCard } from "@/components/organisms/leetify-card";
import { FaceitCard } from "@/components/organisms/faceit-card";
import { CSStatsCard } from "@/components/organisms/csstats-card";
import { PlayerOverviewCard } from "@/components/organisms/player-overview-card";
import { usePlayerByVanityUrl } from "@/stores/players/player-store";
import { useState } from "react";
import { Play } from "lucide-react";
import ThreeDCard from "@/components/atoms/three-d-card";
import Image from "next/image";
import { PremierCard } from "@/components/organisms/premier-card";
import { StatsCard } from "@/components/organisms/stats-card";

// HighlightCard component
function HighlightCard({
  highlight,
  index,
}: {
  highlight: {
    url: string;
    thumbnailUrl?: string;
    description?: string;
    username?: string;
    createdAt?: string;
  };
  index: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {highlight.description || `Highlight ${index + 1}`}
        </h3>
        <iframe
          src={`${highlight.url}&controls=true&interface=false`}
          className="w-full h-64 rounded-lg border"
          allowFullScreen
          allow="fullscreen"
          title={`Player Highlight ${index + 1}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {highlight.username && <span>{highlight.username}</span>}
        </h3>
        {(highlight.username || highlight.createdAt) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {highlight.createdAt && (
              <span>{formatLongDate(highlight.createdAt)}</span>
            )}
          </div>
        )}
      </div>
      <div
        className="relative w-full h-64 rounded-lg border cursor-pointer overflow-hidden group"
        onClick={() => setIsPlaying(true)}
      >
        {highlight?.thumbnailUrl ? (
          <Image
            src={highlight.thumbnailUrl}
            alt={highlight.description || `Highlight ${index + 1} thumbnail`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={index === 0}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span>No Thumbnail</span>
          </div>
        )}
        {/* Gradient overlay from transparent (top) to bg-muted (bottom) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-primary bg-opacity-90 rounded-full p-3 group-hover:bg-opacity-100 transition-all duration-200">
            <Play className="w-6 h-6 text-gray-800 ml-1" />
          </div>
        </div>
        {highlight.description && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-primary text-sm font-medium">
              {highlight.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatLongDate(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  // e.g. Monday, 14 July 2025
  // Some locales may use a different order, so we build it manually for consistency
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const day = date.toLocaleDateString(undefined, { day: "2-digit" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  const year = date.toLocaleDateString(undefined, { year: "numeric" });
  return `${weekday}, ${day} ${month} ${year}`;
}

export default function ProfilePage() {
  const params = useParams();
  const input = params.id as string;

  // Use the new store hook - everything is handled automatically!
  usePlayerByVanityUrl(input);

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full h-full">
        <div className="flex flex-col gap-6">
          <ThreeDCard brand="steam">
            <SteamCard />
          </ThreeDCard>
          <ThreeDCard brand="faceit">
            <FaceitCard />
          </ThreeDCard>
        </div>
        <ThreeDCard brand="leetify">
          <LeetifyCard />
        </ThreeDCard>
        <ThreeDCard brand="faceit">
          <StatsCard />
        </ThreeDCard>
      </div>
    </div>
  );
}
