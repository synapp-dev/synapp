"use client";

/* eslint-disable @next/next/no-img-element -- team avatars are remote CDN URLs */
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { useScrimStore } from "@/stores/scrim-store";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { FALLBACK_TEAM_AVATAR } from "../lib/helpers";
import { useScrimData } from "./scrim-data-provider";

export function ScrimTeamPicker() {
  const { myTeams, selectedTeam } = useScrimData();
  const setSelectedTeamId = useScrimStore((s) => s.setSelectedTeamId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-56 justify-between gap-2"
          aria-label="Select team"
        >
          <span className="flex min-w-0 items-center gap-2">
            <img
              src={selectedTeam?.avatar || FALLBACK_TEAM_AVATAR}
              alt=""
              className="size-5 shrink-0 rounded-full object-cover"
            />
            <span className="truncate">
              {selectedTeam?.name ?? "Select team"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup heading="Your teams">
              {myTeams.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => setSelectedTeamId(team.id)}
                  className="flex items-center gap-2"
                >
                  <img
                    src={team.avatar || FALLBACK_TEAM_AVATAR}
                    alt=""
                    className="size-5 shrink-0 rounded-full object-cover"
                  />
                  <span className="flex-1 truncate">{team.name}</span>
                  {team.id === selectedTeam?.id ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem asChild>
                <Link
                  href="/teams/new"
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Create new team
                </Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
