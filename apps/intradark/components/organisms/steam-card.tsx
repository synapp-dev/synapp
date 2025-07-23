"use client";

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

import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  AlertCircle,
  Calendar,
  Users,
  Trophy,
  LinkIcon,
  ArrowUpRight,
  Gauge,
} from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import Image from "next/image";
import { usePlayerStore } from "@/stores/players/player-store";
import { useSteamProfile } from "@/stores/players/player-store";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { PremierCard } from "./premier-card";

export function SteamCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: steamProfile,
    isLoading: steamLoading,
    error: steamError,
  } = useSteamProfile(steamId64 || "");

  const formatAccountAge = (days: number) => {
    if (days < 365) {
      return `${days} days`;
    }
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return `${years} year${years > 1 ? "s" : ""}${remainingDays > 0 ? `, ${remainingDays} days` : ""}`;
  };

  if (!steamId64) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-24 h-24">
              <AvatarFallback>ST</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>Steam Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {"No player selected or missing Steam ID."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (steamLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>
          <Skeleton className="h-6 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-24 mx-auto" />
          <div className="flex justify-center gap-2 mt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (steamError || !steamProfile?.success) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-24 h-24">
              <AvatarFallback>ST</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>Steam Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {steamError || "Failed to load Steam profile"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const profile = steamProfile.data;
  const accountAge = profile.timecreated
    ? Math.floor((Date.now() / 1000 - profile.timecreated) / (24 * 60 * 60))
    : 0;

  return (
    <Card className="relative group/steam-card w-full h-full">
      <div className="absolute opacity-0 inset-0 bg-gradient-to-br from-blue-800/10 via-blue-800/5 to-transparent z-0 group-hover/steam-card:opacity-100 transition-opacity duration-200 ease-out" />
      <Image
        src="/images/logos/steam-logo-colored.svg"
        alt="Steam background"
        width={800}
        height={800}
        className="pointer-events-none select-none absolute -top-52 -right-48 grayscale opacity-5"
        style={{
          width: "1200px",
          height: "auto",
          zIndex: 0,
        }}
      />
      <Image
        src="/images/logos/steam-logo-colored.svg"
        alt="Steam background"
        width={800}
        height={800}
        className="pointer-events-none select-none absolute -bottom-52 -left-48 grayscale opacity-5"
        style={{
          width: "1200px",
          height: "auto",
          zIndex: 0,
        }}
      />
      <CardHeader className="z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Image
              src="/images/logos/steam-logo-colored.svg"
              alt="Steam"
              width={100}
              height={100}
              className="w-5 h-auto"
            />
            <h1 className="text-xs font-bold text-muted-foreground">Steam</h1>
          </div>

          <div className="flex items-center gap-0.5 text-xs text-muted-foreground hover:underline">
            <ArrowUpRight className="w-3 h-3 mt-0.5" />
            {profile.profileurl && (
              <a
                href={profile.profileurl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.profileurl.replace(/\/+$/, "").split("/").pop()}
              </a>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col z-10">
        <div className="flex items-start gap-4">
          <Image
            src={profile.avatarfull}
            alt={profile.personaname}
            width={500}
            height={500}
            className="rounded-lg w-20 h-auto border-2 border-muted-foreground/50"
          />
          <div className="flex flex-col gap-2 w-full h-full">
            <div>
              <h1 className="text-lg font-bold text-ellipsis line-clamp-1 overflow-hidden">
                {profile.personaname}
              </h1>
              {/* <div className="text-sm text-muted-foreground">
                {profile.realname}
              </div> */}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {(() => {
                  const years = Math.floor(accountAge / 365);
                  const badgeYear = Math.max(1, Math.min(years, 21)); // Clamp between 1 and 21
                  const badgeSrc = `/images/steam/badges/steam-years-${badgeYear}.png`;
                  return (
                    <Image
                      src={badgeSrc}
                      alt={`Steam ${badgeYear} Year Badge`}
                      width={80}
                      height={80}
                      className="w-12 h-auto -mx-0.5"
                    />
                  );
                })()}
              </div>
              <div>
                {/* steam level */}
                <div className="w-fit aspect-square flex items-center justify-center gap-1 bg-muted-foreground/10 rounded-full border border-muted-foreground/50 px-2">
                  <span className="text-sm font-bold">
                    {profile.player_level}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <PremierCard />
      </CardContent>
    </Card>
  );
}
