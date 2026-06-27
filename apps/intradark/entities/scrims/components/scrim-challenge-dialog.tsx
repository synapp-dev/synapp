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

import type { ScrimMap, ScrimTeam } from "../types";
import { FALLBACK_TEAM_AVATAR, mapById } from "../lib/helpers";
import { submitChallenge, type ListingItem } from "../lib/client";
import { MockTeamRating } from "./mock-team-rating";

export function ScrimChallengeDialog({
  listing,
  myTeam,
  maps,
  onClose,
  onSubmitted,
}: {
  listing: ListingItem;
  myTeam: ScrimTeam;
  maps: ScrimMap[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const offeredMaps = (listing.scrim_listing_maps ?? [])
    .map((m) => mapById(maps, m.map_id))
    .filter((m): m is ScrimMap => Boolean(m));

  const toggle = (id: string) => {
    setError("");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (selected.length === 0) {
      setError("Select at least one map to challenge.");
      return;
    }
    setSaving(true);
    const { error: err, code } = await submitChallenge({
      listingId: listing.id,
      teamId: myTeam.id,
      mapIds: selected,
    });
    setSaving(false);
    if (err) {
      setError(
        code === "23505"
          ? "Your team has already challenged this listing."
          : "There was an error submitting your challenge.",
      );
      return;
    }
    onSubmitted();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={listing.team?.avatar || FALLBACK_TEAM_AVATAR}
                alt=""
                className="size-14 rounded-full object-cover"
              />
              <div>
                <DialogTitle className="text-2xl font-black">
                  {listing.team?.name}
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
            Pick the maps you want to offer:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {offeredMaps.map((map) => {
              const isSel = selected.includes(map.id);
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => toggle(map.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                    isSel
                      ? "border-orange-400 bg-orange-500/10"
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
            disabled={selected.length === 0 || saving}
            onClick={submit}
            className="border border-orange-900 bg-orange-900/40 hover:bg-orange-800"
          >
            Submit Challenge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
