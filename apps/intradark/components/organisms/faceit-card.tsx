import { useFaceitProfile, usePlayerStore } from "@/hooks/players";
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

export function FaceitCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;

  const {
    profile: faceitProfile,
    isLoading: faceitLoading,
    error: faceitError,
  } = useFaceitProfile(steamId64 || "");

  return (
    <Card className="relative group/faceit-card w-full h-full">
      <div className="absolute opacity-0 inset-0 bg-gradient-to-br from-orange-800/10 via-orange-800/5 to-transparent z-0 group-hover/faceit-card:opacity-100 transition-opacity duration-200 ease-out" />
      <Image
        src="/images/logos/faceit-logo-colored.svg"
        alt="Faceit background"
        width={1600}
        height={1600}
        className="pointer-events-none select-none absolute -top-40 -right-24 grayscale opacity-5"
        style={{
          width: "1200px",
          height: "auto",
          zIndex: 0,
        }}
      />
      <Image
        src="/images/logos/faceit-logo-colored.svg"
        alt="Faceit background"
        width={1600}
        height={1600}
        className="pointer-events-none select-none absolute -bottom-24 -left-24 grayscale opacity-5"
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
              src="/images/logos/faceit-logo-colored.svg"
              alt="FACEIT"
              width={20}
              height={20}
            />
            <h1 className="text-xs font-bold text-muted-foreground">FACEIT</h1>
          </div>
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground hover:underline">
            <ArrowUpRight className="w-3 h-3 mt-0.5" />
            {faceitProfile?.payload.nickname && (
              <a
                href={`https://www.faceit.com/en/players/${faceitProfile?.payload.nickname}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {faceitProfile?.payload.nickname}
              </a>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 items-center justify-center">
            <div className="flex items-center gap-1.5">
              <FaceitLevelBadge
                level={faceitProfile?.payload.games.csgo?.skill_level || 0}
                size="sm"
              />
              <p className="text-2xl font-bold">
                <CountUp
                  end={faceitProfile?.payload.games.csgo?.faceit_elo || 0}
                  duration={2}
                  separator=","
                />
              </p>
            </div>

            <p className="text-sm text-muted-foreground">CSGO</p>
          </div>
          <div className="flex flex-col gap-1 items-center justify-center">
            <div className="flex items-center gap-1.5">
              <FaceitLevelBadge
                level={faceitProfile?.payload.games.cs2?.skill_level || 0}
                size="sm"
              />
              <p className="text-2xl font-bold">
                <CountUp
                  end={faceitProfile?.payload.games.cs2?.faceit_elo || 0}
                  duration={2}
                  separator=","
                />
              </p>
            </div>

            <p className="text-sm text-muted-foreground">CS2</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
