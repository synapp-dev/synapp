import { useFaceitProfile, usePlayerStore } from "@/entities/players";
import {
  Card,
  CardTitle,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { FaceitLevelBadge } from "../atoms/faceit-level-badge";
import CountUp from "react-countup";

export function FaceitElo({
  /** Seconds before the count-up begins (e.g. wait for a parent fade-in). */
  delay = 0,
}: {
  delay?: number;
} = {}) {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;

  const {
    profile: faceitProfile,
    isLoading: faceitLoading,
    error: faceitError,
  } = useFaceitProfile(steamId64 || "");

  return (
    <div className="flex flex-row items-center gap-2">
      {/* <div className="flex items-center gap-1">
            <Image
              src="/images/logos/faceit-logo-colored.svg"
              alt="FACEIT"
              width={20}
              height={20}
            />
            </div> */}
      {/* <p className="text-sm text-white/90 font-light">100</p> */}
      <div className="flex flex-col gap-1 items-center justify-center">
        <div className="flex items-center gap-1.5">
          <FaceitLevelBadge
            level={faceitProfile?.payload.games.cs2?.skill_level || 10}
            size="xs"
          />
          <p className="font-bold animate-slide-up-fade-in-slow pb-0.5">
            <CountUp
              end={faceitProfile?.payload.games.cs2?.faceit_elo || 3478}
              duration={2}
              delay={delay}
              separator=","
            />
          </p>
        </div>
      </div>
    </div>
  );
}
