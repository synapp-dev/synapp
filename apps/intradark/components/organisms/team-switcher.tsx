"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { ArrowLeftRight, Users, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamSummary } from "@/entities/teams/types";
import { teamHomePath } from "@/entities/teams/lib/resolve-team-slug";
import { useTeamStore } from "@/stores/team-store";

function TeamIconBadge({
  size = "md",
  avatarUrl,
}: {
  size?: "sm" | "md";
  avatarUrl?: string | null;
}) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const containerSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const showAvatar =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 0;

  return (
    <div
      className={cn(
        containerSize,
        "rounded flex items-center aspect-square justify-center bg-sidebar-primary overflow-hidden",
      )}
    >
      {showAvatar ? (
        /* eslint-disable-next-line @next/next/no-img-element -- external avatar */
        <img src={avatarUrl!} alt="" className="h-full w-full object-cover" />
      ) : (
        <Users className={cn(iconSize, "text-sidebar-primary-foreground")} />
      )}
    </div>
  );
}

export function TeamSwitcher({ teams }: { teams: TeamSummary[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { state, isMobile } = useSidebar();
  const displayState = isMobile ? "expanded" : state;
  const router = useRouter();
  const pathname = usePathname();

  const currentTeam = useTeamStore((s) => s.currentTeam);
  const setCurrentTeam = useTeamStore((s) => s.setCurrentTeam);
  const clearCurrentTeam = useTeamStore((s) => s.clearCurrentTeam);

  const hasOnlyOneTeam = teams.length === 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const match = pathname?.match(/\/teams\/([^/]+)(?:[/?#]|$)/);
    const slugFromPath = match ? decodeURIComponent(match[1]!) : null;

    if (slugFromPath && teams.length > 0) {
      const fromList = teams.find((t) => t.slug === slugFromPath);
      if (fromList) {
        setCurrentTeam(fromList);
        return;
      }
    }

    if (hasOnlyOneTeam && !currentTeam && teams.length > 0) {
      setCurrentTeam(teams[0]!);
    }
  }, [mounted, pathname, hasOnlyOneTeam, currentTeam, setCurrentTeam, teams]);

  const handleTeamToggle = () => {
    if (currentTeam) {
      clearCurrentTeam();
      router.push("/dashboard");
    }
  };

  const handleTeamSelect = (team: TeamSummary, isSelected: boolean) => {
    if (isSelected) {
      clearCurrentTeam();
      setOpen(false);
      router.push("/dashboard");
      return;
    }
    setCurrentTeam(team);
    setOpen(false);
    router.push(teamHomePath(team.slug));
  };

  if (teams.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem
        className={cn(
          "items-center w-full flex pb-2",
          displayState === "expanded" ? "" : "pl-2",
        )}
      >
        {hasOnlyOneTeam ? (
          <SidebarMenuButton
            tooltip={currentTeam?.name || "Team"}
            className={cn(
              "w-full flex items-center gap-2 group/team-switcher py-6",
              displayState === "expanded" ? "justify-start" : "justify-center",
            )}
            onClick={handleTeamToggle}
          >
            {displayState === "expanded" ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <TeamIconBadge
                  size="md"
                  avatarUrl={currentTeam?.avatar ?? teams[0]?.avatar}
                />
                <div className="flex flex-col text-left -space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-medium truncate">
                    {currentTeam?.name || teams[0]?.name || "No team selected"}
                  </h3>
                </div>
              </div>
            ) : (
              <TeamIconBadge
                size="sm"
                avatarUrl={currentTeam?.avatar ?? teams[0]?.avatar}
              />
            )}
          </SidebarMenuButton>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                tooltip={currentTeam?.name || "Select team"}
                className={cn(
                  "w-full flex items-center gap-2 group/team-switcher py-6",
                  displayState === "expanded"
                    ? "justify-between"
                    : "justify-center",
                )}
              >
                {displayState === "expanded" ? (
                  <>
                    <div
                      className={cn(
                        "flex items-center gap-2 min-w-0 max-w-[80%]",
                        currentTeam?.name ? "" : "mx-2",
                      )}
                    >
                      {currentTeam?.name ? (
                        <div className="flex-shrink-0">
                          <TeamIconBadge
                            size="md"
                            avatarUrl={currentTeam.avatar}
                          />
                        </div>
                      ) : (
                        <Users className="size-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex flex-col text-left -space-y-0.5 min-w-0 flex-1">
                        <h3
                          className={cn(
                            "font-medium truncate",
                            currentTeam?.name
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {currentTeam?.name || "Select a team!"}
                        </h3>
                      </div>
                    </div>
                    {currentTeam?.name ? (
                      <ArrowLeftRight className="flex-shrink-0 group-hover/team-switcher:rotate-180 group-hover/team-switcher:animate-pulse transition-transform duration-300 mr-1" />
                    ) : (
                      <ArrowLeftRight className="size-4 text-muted-foreground flex-shrink-0 mr-1" />
                    )}
                  </>
                ) : (
                  <TeamIconBadge
                    size="sm"
                    avatarUrl={currentTeam?.avatar}
                  />
                )}
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="right">
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground">Change team</p>
              </div>
              <Command>
                <CommandList>
                  {currentTeam ? (
                    <CommandGroup heading="Current team">
                      <CommandItem
                        value={currentTeam.name}
                        onSelect={() => handleTeamSelect(currentTeam, true)}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium truncate flex-1">
                          {currentTeam.name}
                        </span>
                        <Check className="h-4 w-4 text-primary" />
                      </CommandItem>
                    </CommandGroup>
                  ) : null}
                  <CommandGroup heading={currentTeam ? "Suggested" : undefined}>
                    {teams
                      .filter((t) => t.id !== currentTeam?.id)
                      .map((team) => (
                        <CommandItem
                          key={team.id}
                          value={team.name}
                          onSelect={() => handleTeamSelect(team, false)}
                          className="flex items-center gap-2"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium truncate">
                            {team.name}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
