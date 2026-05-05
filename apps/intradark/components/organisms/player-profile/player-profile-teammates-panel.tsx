"use client";

import Image from "next/image";
import { Activity, Crosshair, Trophy, UserRound } from "lucide-react";

import {
  TEAM_ROSTER_HEADER,
  TEAMMATE_SLIDES,
} from "@/lib/player-profile-showcase-data";
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

const sectionShell =
  "border-white/10 bg-[#0a0f1c] text-white shadow-black/40 shadow-xl";

export type PlayerProfileTeammatesPanelProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileTeammatesPanel({
  playerId,
  className,
}: PlayerProfileTeammatesPanelProps) {
  void playerId;
  const teammates = TEAMMATE_SLIDES.slice(0, 5);
  const team = TEAM_ROSTER_HEADER;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-xl font-bold tracking-tight text-white">Teammates</h2>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className={cn(
            "relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden py-0",
            sectionShell,
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <Image
              src={team.logoBgSrc}
              alt=""
              fill
              className="object-contain object-center p-12 opacity-[0.12] blur-2xl"
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-chart-2/20 via-[#0a0f1c]/95 to-[#0a0f1c]"
              aria-hidden
            />
          </div>
          <div className="relative z-[1] flex flex-col items-center gap-5 px-6 py-10 text-center">
            <div className="relative size-28 sm:size-32">
              <Image
                src={team.logoSrc}
                alt={`${team.name} logo`}
                fill
                className="object-contain"
                sizes="128px"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-5xl">
                {team.name}
              </p>
              <p className="text-sm font-medium text-white/55 sm:text-base">
                {team.subtitle}
              </p>
            </div>
          </div>
        </Card>

        {teammates.map((tm) => (
          <Card
            key={tm.id}
            className={cn(
              "relative flex min-h-[380px] flex-col overflow-hidden py-0",
              sectionShell,
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <Image
                src={tm.bgSrc}
                alt=""
                fill
                className="object-cover object-center opacity-30 blur-md"
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-chart-2/25 via-[#0a0f1c]/88 to-[#0a0f1c]"
                aria-hidden
              />
            </div>

            <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[220px] shrink-0 px-4 pt-5">
                <Image
                  src={tm.portraitSrc}
                  alt={tm.handle}
                  fill
                  className="object-contain object-bottom"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 220px"
                />
              </div>

              <div className="mt-auto flex flex-col gap-2.5 p-4 pt-2 sm:p-5">
                <p className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-3xl">
                  {tm.handle}
                </p>
                <div className="flex flex-row flex-wrap items-center gap-2 text-xs text-white/80 sm:text-sm">
                  <span className="text-base leading-none" aria-hidden>
                    {tm.countryFlag}
                  </span>
                  <span>{tm.fullName}</span>
                  <span className="text-white/35">|</span>
                  <span>{tm.ageLabel}</span>
                </div>
                <div className="flex flex-row flex-wrap items-center gap-2 text-xs text-white/85 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    {tm.isCoach ? (
                      <UserRound className="size-3.5 shrink-0 text-white" aria-hidden />
                    ) : (
                      <Crosshair className="size-3.5 shrink-0 text-white" aria-hidden />
                    )}
                    {tm.role}
                  </span>
                  <span className="text-white/35">·</span>
                  <span>{tm.teamName}</span>
                </div>
                <div className="flex flex-row flex-wrap gap-2 pt-0.5">
                  <Badge
                    variant="outline"
                    className="border-chart-2/70 bg-black/30 text-xs text-chart-2 sm:text-sm"
                  >
                    <Activity aria-hidden />
                    {tm.ratingBadge}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-chart-4/70 bg-black/30 text-xs text-chart-4 sm:text-sm"
                  >
                    <Trophy aria-hidden />
                    {tm.placementBadge}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
