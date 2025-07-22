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
import { AlertCircle, Calendar, Users, Trophy } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import Image from "next/image";
import { usePlayerStore } from "@/stores/players/player-store";
import { useSteamProfile } from "@/stores/players/player-store";

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
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image
            src="/images/logos/steam-logo-colored.svg"
            alt="Steam"
            width={100}
            height={100}
            className="w-5 h-auto"
          />
          Steam
        </CardTitle>
        <div className="flex justify-center mb-4">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatarfull} />
            <AvatarFallback>
              {profile.personaname.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle>{profile.personaname}</CardTitle>
        {profile.realname && (
          <p className="text-muted-foreground">{profile.realname}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Account Age</span>
            </div>
            <span className="text-sm font-medium">
              {formatAccountAge(accountAge)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Steam Level</span>
            </div>
            <span className="text-sm font-medium">{profile.player_level}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Friends</span>
            </div>
            <span className="text-sm font-medium">{profile.friends_count}</span>
          </div>

          <div className="pt-3 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Steam ID</p>
              <p className="font-mono text-sm">{profile.steamid}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
