"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map/team art */
import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

import type { ScrimMap } from "../types";
import { FALLBACK_TEAM_AVATAR, mapById } from "../lib/helpers";
import { acceptChallenge, type ChallengeItem, type ListingItem } from "../lib/client";
import { MockTeamRating } from "./mock-team-rating";

export function ScrimAcceptDialog({
  challenge,
  listing,
  maps,
  onClose,
  onAccepted,
}: {
  challenge: ChallengeItem;
  listing: ListingItem;
  maps: ScrimMap[];
  onClose: () => void;
  onAccepted: (scrimId: string) => void;
}) {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const offeredMaps = (challenge.scrim_challenge_maps ?? [])
    .map((m) => mapById(maps, m.map_id))
    .filter((m): m is ScrimMap => Boolean(m));

  const submit = async () => {
    if (!selectedMap) {
      setError("Pick the map to play.");
      return;
    }
    setSaving(true);
    const { error: err, scrimId } = await acceptChallenge({
      challengeId: challenge.id,
      mapId: selectedMap,
    });
    setSaving(false);
    if (err || !scrimId) {
      setError(err ?? "Could not accept the challenge.");
      return;
    }
    onAccepted(scrimId);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={challenge.team?.avatar || FALLBACK_TEAM_AVATAR}
                alt=""
                className="size-14 rounded-full object-cover"
              />
              <div>
                <DialogTitle className="text-2xl font-black">
                  {challenge.team?.name}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(listing.timeslot), "h:mm a")} ·{" "}
                  {format(new Date(listing.timeslot), "EEEE, MMMM do")}
                </DialogDescription>
              </div>
            </div>
            <MockTeamRating />
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="mb-2 text-sm text-muted-foreground">
            Choose the map to play:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {offeredMaps.map((map) => {
              const isSel = selectedMap === map.id;
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => {
                    setError("");
                    setSelectedMap(map.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                    isSel
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  {map.badge ? (
                    <img src={map.badge} alt="" className="h-4 w-auto object-contain" />
                  ) : null}
                  <span className={cn("text-sm", isSel ? "font-bold" : "text-muted-foreground")}>
                    {map.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {error ? <p className="flex-1 text-xs font-bold text-red-400">{error}</p> : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedMap || saving}
            onClick={submit}
            className="border border-blue-900 bg-blue-900/40 hover:bg-blue-800"
          >
            Accept Challenge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
