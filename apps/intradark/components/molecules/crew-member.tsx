import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useSteamProfile,
  useCSStatsProfile,
  useFaceitProfile,
} from "@/stores/players/player-store";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import { PremierEloBadge } from "@/components/atoms/premier-elo-badge";
import { FaceitLevelBadge } from "@/components/atoms/faceit-level-badge";

interface CrewMemberProps {
  steamid64: string;
  gameCount: number;
}

export const CrewMember: React.FC<CrewMemberProps> = ({
  steamid64,
  gameCount,
}) => {
  const { profile, isLoading } = useSteamProfile(steamid64);
  const { profile: csstatsProfile } = useCSStatsProfile(steamid64);
  const { profile: faceitProfile } = useFaceitProfile(steamid64);
  const avatarUrl = profile?.data?.avatarfull;

  // Get current premier rank from CSStats
  const currentRank = csstatsProfile?.data?.ranks?.[0]?.current;

  // Get FACEIT CS2 data
  const faceitCS2Level = faceitProfile?.payload?.games?.cs2?.skill_level || 0;
  const faceitCS2Elo = faceitProfile?.payload?.games?.cs2?.faceit_elo || 0;

  return (
    <div className="flex flex-col items-center">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Link
            href={`/@${steamid64}`}
            className="rounded-full bg-muted w-11 h-11 flex items-center justify-center overflow-hidden cursor-pointer"
          >
            {isLoading ? (
              <span className="text-xs text-muted-foreground">...</span>
            ) : avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={steamid64}
                width={44}
                height={44}
                className="rounded-full w-11 h-11 object-cover"
              />
            ) : (
              <span className="text-xs text-muted-foreground">?</span>
            )}
          </Link>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto" side="top">
          <div className="flex flex-col gap-2">
            {profile?.data?.personaname && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">
                  {profile.data.personaname}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {gameCount} game{gameCount !== 1 ? "s" : ""} in last 30
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentRank && (
                <div className="flex items-center gap-2">
                  <PremierEloBadge rank={currentRank} size="sm" />
                </div>
              )}
              {faceitCS2Elo > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <FaceitLevelBadge level={faceitCS2Level} size="xs" />
                    <span className="text-sm font-bold text-muted-foreground">
                      {faceitCS2Elo.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
