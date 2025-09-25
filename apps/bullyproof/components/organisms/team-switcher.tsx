"use client";

import * as React from "react";
import { ArrowLeftRight, Plus, School } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";

import schools from "@/lib/data.json";
import { useDemoUserSwitcherStore } from "@/stores/demo-user-switcher-store";

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const selectedRole = useDemoUserSwitcherStore((s) => s.selectedUser);

  const teams = React.useMemo(
    () =>
      (
        schools as Array<{
          name: string;
          slug: string;
          type: string;
          levels: string[];
          roles: string[];
        }>
      )
        .filter((s) => s.roles.includes(selectedRole))
        .map((s) => ({
          name: s.name,
          slug: s.slug,
          logo: School,
          plan: s.type,
        })),
    [selectedRole]
  );

  const [activeTeam, setActiveTeam] = React.useState(teams[0]);

  const setSelectedSchoolSlug = useDemoUserSwitcherStore(
    (s) => s.setSelectedSchoolSlug
  );

  React.useEffect(() => {
    setActiveTeam(teams[0]);
    setSelectedSchoolSlug(teams[0] ? teams[0].slug : null);
  }, [teams, setSelectedSchoolSlug]);

  if (!activeTeam) {
    return null;
  }

  const canSwitch = teams.length > 1;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="px-2 items-center">
        {canSwitch ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <activeTeam.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeTeam.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeTeam.plan}
                  </span>
                </div>
                <ArrowLeftRight />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Schools
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem key={team.name} asChild className="gap-2 p-2">
                  <Link
                    href={`/schools/${team.slug}`}
                    onClick={() => {
                      setActiveTeam(team);
                      setSelectedSchoolSlug(team.slug);
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <team.logo className="size-3.5 shrink-0" />
                    </div>
                    {team.name}
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Add school
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <activeTeam.logo className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {activeTeam.plan}
              </span>
            </div>
            {/* <ArrowLeftRight /> */}
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
