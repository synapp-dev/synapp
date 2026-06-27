"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map/team art */
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronsRight, Loader2, X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import type { ScrimMap, ScrimTeam, Tier } from "../types";
import {
  FALLBACK_TEAM_AVATAR,
  isTierWorthy,
  mapById,
  tierById,
  tierColor,
} from "../lib/helpers";
import {
  cancelChallenge,
  cancelListing,
  fetchListingChallenges,
  fetchMyChallenge,
  type ChallengeItem,
  type ListingItem,
} from "../lib/client";

export function ScrimListingRow({
  listing,
  myTeam,
  tiers,
  maps,
  onChallenge,
  onAccept,
  onChanged,
}: {
  listing: ListingItem;
  myTeam: ScrimTeam;
  tiers: Tier[];
  maps: ScrimMap[];
  onChallenge: (listing: ListingItem) => void;
  onAccept: (challenge: ChallengeItem, listing: ListingItem) => void;
  onChanged: () => void;
}) {
  const isMine = listing.team_id === myTeam.id;
  const worthy = isTierWorthy(tiers, myTeam.tierId, listing.min_tier_id);
  const posterTier = tierById(tiers, listing.team?.tier_id);

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [myChallenge, setMyChallenge] = useState<ChallengeItem | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (isMine) {
      setChallenges(await fetchListingChallenges(listing.id));
    } else {
      setMyChallenge(await fetchMyChallenge(listing.id, myTeam.id));
    }
    setLoading(false);
  }, [isMine, listing.id, myTeam.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const listingMaps = (myChallenge?.scrim_challenge_maps ?? listing.scrim_listing_maps ?? [])
    .map((m) => mapById(maps, m.map_id))
    .filter((m): m is ScrimMap => Boolean(m?.badge));

  const handleCancelOffer = async () => {
    if (!myChallenge) return;
    await cancelChallenge(myChallenge.id);
    setMyChallenge(null);
    onChanged();
  };

  const handleCancelListing = async () => {
    await cancelListing(listing.id);
    onChanged();
  };

  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-l-4 bg-card px-4 py-3 transition-all animate-slide-down-fade-in",
          isMine && "bg-accent/40",
          myChallenge && "bg-orange-500/5",
          challenges.length > 0 && "bg-blue-500/5",
        )}
        style={{ borderLeftColor: tierColor(posterTier) ?? "transparent" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={listing.team?.avatar || FALLBACK_TEAM_AVATAR}
            alt=""
            className="size-6 shrink-0 rounded-full object-cover"
          />
          <span className="truncate font-bold">
            {listing.team?.name ?? "Team"}
          </span>
          {posterTier ? (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: tierColor(posterTier) }}
              title={posterTier.name}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {listingMaps.map((m) => (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <img src={m.badge!} alt={m.name} className="h-5 w-auto object-contain" />
                </TooltipTrigger>
                <TooltipContent>{m.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : isMine ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={challenges.length === 0}
                onClick={() => setExpanded((e) => !e)}
              >
                Requests ({challenges.length})
                <ChevronDown
                  className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-red-500 hover:bg-red-500/10"
                    onClick={handleCancelListing}
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel this listing</TooltipContent>
              </Tooltip>
            </div>
          ) : myChallenge ? (
            <Button
              variant="outline"
              size="sm"
              className="border-red-800 text-red-400 hover:bg-red-900/40 animate-slide-right-fade-in"
              onClick={handleCancelOffer}
            >
              Cancel Offer
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled={!worthy}
                    onClick={() => onChallenge(listing)}
                    className="border border-orange-900 bg-orange-900/30 hover:bg-orange-800 animate-slide-right-fade-in"
                  >
                    Challenge
                  </Button>
                </span>
              </TooltipTrigger>
              {!worthy ? (
                <TooltipContent>Your team&apos;s tier is too low for this listing</TooltipContent>
              ) : null}
            </Tooltip>
          )}
        </div>
      </div>

      {/* Incoming requests (owner) */}
      {isMine && expanded && challenges.length > 0 ? (
        <div className="flex flex-col">
          {challenges.map((ch) => {
            const chMaps = ch.scrim_challenge_maps
              .map((m) => mapById(maps, m.map_id))
              .filter((m): m is ScrimMap => Boolean(m?.badge));
            return (
              <button
                key={ch.id}
                onClick={() => onAccept(ch, listing)}
                className="flex items-center justify-between gap-2 border-l-4 border-blue-500/40 bg-card/60 px-4 py-2 pl-10 text-left transition-colors hover:bg-accent animate-slide-left-fade-in"
              >
                <div className="flex items-center gap-2">
                  <ChevronsRight className="size-4 animate-pulse text-blue-400" />
                  <img
                    src={ch.team?.avatar || FALLBACK_TEAM_AVATAR}
                    alt=""
                    className="size-5 rounded-full object-cover"
                  />
                  <span className="text-sm font-semibold">{ch.team?.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {chMaps.map((m) => (
                    <img
                      key={m.id}
                      src={m.badge!}
                      alt={m.name}
                      title={m.name}
                      className="h-4 w-auto object-contain"
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
