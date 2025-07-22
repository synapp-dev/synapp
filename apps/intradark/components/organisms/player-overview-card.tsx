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
import { Target, Zap, MapPin, Eye, Trophy } from "lucide-react";

export function PlayerOverviewCard() {
  // Dummy data for now
  const playerData = {
    alias: "Jourdain",
    avatar:
      "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
    faceitElo: 2450,
    premierElo: 18500,
    skills: {
      aim: 87,
      utility: 92,
      positioning: 84,
      opening: 89,
      clutch: 91,
    },
  };

  return (
    <Card className="w-1/2">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <Avatar className="w-32 h-32 border-4 border-primary/20">
            <AvatarImage src={playerData.avatar} />
            <AvatarFallback className="text-2xl font-bold">
              {playerData.alias.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-2xl font-bold text-primary">
          {playerData.alias}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ELO Ratings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-200/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-orange-600">
                FACEIT
              </span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {playerData.faceitElo.toLocaleString()}
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/20">
            {/* <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">PREMIER</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {playerData.premierElo.toLocaleString()}
            </div> */}
            <div className="relative">
              <div className="-skew-x-12 bg-red-500 h-full w-2 absolute" />
              <div className="-skew-x-12 bg-red-500 h-full w-2" />
              212
            </div>
          </div>
        </div>

        {/* Skill Stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Skill Ratings
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Aim</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {playerData.skills.aim}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Utility</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {playerData.skills.utility}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Positioning</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {playerData.skills.positioning}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Opening</span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {playerData.skills.opening}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Clutch</span>
            </div>
            <span className="text-lg font-bold text-orange-600">
              {playerData.skills.clutch}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
