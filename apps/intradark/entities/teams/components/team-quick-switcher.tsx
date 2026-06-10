"use client";

import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Users } from "lucide-react";

import type { TeamSummary } from "@/entities/teams/types";
import { teamHomePath } from "@/entities/teams/lib/resolve-team-slug";
import { useTeamStore } from "@/stores/team-store";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

export function TeamQuickSwitcher({ teams }: { teams: TeamSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const setCurrentTeam = useTeamStore((s) => s.setCurrentTeam);

  if (teams.length <= 1) return null;

  const active =
    currentTeam ??
    teams.find((t) => pathname?.includes(`/teams/${t.slug}/`)) ??
    teams[0]!;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-xs justify-between gap-2"
          aria-label="Switch team"
        >
          <span className="truncate">{active.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup heading="Your teams">
              {teams.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => {
                    setCurrentTeam(team);
                    router.push(teamHomePath(team.slug));
                  }}
                  className="flex items-center gap-2"
                >
                  <Users className="size-3.5 shrink-0" />
                  <span className="truncate flex-1">{team.name}</span>
                  {team.id === active.id ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
