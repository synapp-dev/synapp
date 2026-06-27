"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN team art */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Ban, DoorOpen, ListOrdered } from "lucide-react";

import type { TeamRosterMember } from "@/entities/teams/types";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import type { ScrimDetail, TeamServer } from "../../types";
import { FALLBACK_TEAM_AVATAR } from "../../lib/helpers";
import { ScrimTeamColumn } from "./scrim-team-column";
import { ScrimMapBox } from "./scrim-map-box";
import { ScrimServerBox } from "./scrim-server-box";
import { ScrimChatBox } from "./scrim-chat-box";

export function ScrimLobby({
  scrim,
  homeRoster,
  awayRoster,
  servers,
  canManage,
}: {
  scrim: ScrimDetail;
  homeRoster: TeamRosterMember[];
  awayRoster: TeamRosterMember[];
  servers: (TeamServer & { teamName: string })[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("scrims")
      .update({ active: false, scrim_cancel_id: user?.id ?? null })
      .eq("id", scrim.id);
    setCancelling(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-down-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <img
              src={scrim.homeTeam.avatar || FALLBACK_TEAM_AVATAR}
              alt=""
              className="size-6 rounded-full object-cover"
            />
            <span className="font-bold">{scrim.homeTeam.name}</span>
          </span>
          <span className="text-sm text-muted-foreground">vs.</span>
          <span className="flex items-center gap-2">
            <img
              src={scrim.awayTeam.avatar || FALLBACK_TEAM_AVATAR}
              alt=""
              className="size-6 rounded-full object-cover"
            />
            <span className="font-bold">{scrim.awayTeam.name}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-bold">
            <DoorOpen className="size-4" /> Lobby
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm font-bold text-muted-foreground/40">
                <ListOrdered className="size-4" /> Scoreboard
              </span>
            </TooltipTrigger>
            <TooltipContent>Available with a managed server</TooltipContent>
          </Tooltip>
        </div>

        <span className="text-sm font-bold">
          {format(parseISO(scrim.matchTime), "MMMM d, yyyy, h:mm a")}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="order-2 md:order-1 md:flex-1">
          <ScrimTeamColumn team={scrim.homeTeam} roster={homeRoster} />
        </div>

        <div className="order-1 flex flex-col items-center gap-4 md:order-2 md:w-80">
          <ScrimMapBox scrim={scrim} />

          {scrim.active && canManage ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-red-900 text-red-400 hover:bg-red-900/40 hover:text-white"
                >
                  <Ban className="size-4" /> Cancel Scrim
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this scrim?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. Both teams will see the scrim as
                    cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={cancel}
                    disabled={cancelling}
                    className="bg-red-900 hover:bg-red-800"
                  >
                    Yes, cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}

          {scrim.active ? <ScrimServerBox scrim={scrim} servers={servers} /> : null}
          {scrim.active ? <ScrimChatBox scrimId={scrim.id} /> : null}
        </div>

        <div className="order-3 md:flex-1">
          <ScrimTeamColumn team={scrim.awayTeam} roster={awayRoster} />
        </div>
      </div>
    </div>
  );
}
