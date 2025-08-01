"use client";

import { useParams } from "next/navigation";

import { SteamCard } from "@/components/organisms/steam-card";
import { LeetifyCard } from "@/components/organisms/leetify-card";
import { FaceitCard } from "@/components/organisms/faceit-card";

import { usePlayerByVanityUrl } from "@/stores/players/player-store";

import ThreeDCard from "@/components/atoms/three-d-card";

import { StatsCard } from "@/components/organisms/stats-card";
import { FormCard } from "@/components/organisms/form-card";
import { CrewCard } from "@/components/molecules/crew-card";
import { BotPreviewCard } from "@/components/organisms/bot-preview-card";
import { HighlightsCard } from "@/components/organisms/highlights-card";
import { CommentsCard } from "@/components/organisms/comments-card";
import { TrustScoreCard } from "@/components/organisms/trust-scorecard";

export default function VeritasCheckPage() {
  const params = useParams();
  const input = params.id as string;

  usePlayerByVanityUrl(input);

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full h-full">
        <div className="flex flex-col gap-6">
          <BotPreviewCard />

          <ThreeDCard brand="steam">
            <SteamCard />
          </ThreeDCard>
          <ThreeDCard brand="faceit">
            <FaceitCard />
          </ThreeDCard>
        </div>
        <div className="flex flex-col gap-6">
          <ThreeDCard brand="leetify">
            <LeetifyCard />
          </ThreeDCard>
          <ThreeDCard brand="faceit">
            <CrewCard />
          </ThreeDCard>
        </div>

        <div className="flex flex-col gap-6">
          <ThreeDCard brand="faceit">
            <FormCard />
          </ThreeDCard>
          <ThreeDCard brand="faceit">
            <StatsCard />
          </ThreeDCard>
        </div>
      </div>
      <HighlightsCard />
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <TrustScoreCard />
        </div>
        <div className="col-span-3">
          <CommentsCard />
        </div>
      </div>
    </div>
  );
}
