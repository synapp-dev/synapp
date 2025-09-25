"use client";

import * as React from "react";
import { ArrowLeftRight, Plus, School } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

import { createBrowserClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";
import { useDemoUserSwitcherStore } from "@/stores/demo-user-switcher-store";

export function SchoolSwitcher() {
  const { isMobile } = useSidebar();
  const selectedRole = useDemoUserSwitcherStore((s) => s.selectedUser);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const router = useRouter();

  const [schools, setSchools] = React.useState<Array<Tables<"schools">>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState<string>("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadSchools() {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from("schools")
        .select("*");
      if (!isMounted) return;
      if (error) {
        setFetchError(error.message);
        setSchools([]);
      } else {
        setSchools((data ?? []).filter((s): s is Tables<"schools"> => Boolean(s?.id)));
      }
      setLoading(false);
    }
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const teams = React.useMemo(
    () =>
      (schools ?? []).map((s) => ({
        name: s.name,
        slug: s.slug ?? s.id,
        logo: School,
        plan: s.sector_id ?? "",
      })),
    [schools]
  );

  const filteredTeams = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams.slice(0, 5);
    const score = (t: { name: string; slug: string }) => {
      const name = t.name.toLowerCase();
      const slug = t.slug.toLowerCase();
      const nameIdx = name.indexOf(q);
      const slugIdx = slug.indexOf(q);
      const bestIdx = Math.min(nameIdx === -1 ? Infinity : nameIdx, slugIdx === -1 ? Infinity : slugIdx);
      if (bestIdx === Infinity) return Infinity;
      return bestIdx;
    };
    return teams
      .map((t) => ({ t, s: score(t) }))
      .filter((x) => x.s !== Infinity)
      .sort((a, b) => a.s - b.s || a.t.name.localeCompare(b.t.name))
      .slice(0, 5)
      .map((x) => x.t);
  }, [teams, query]);

  const [activeTeam, setActiveTeam] = React.useState(teams[0]);

  const setSelectedSchoolSlug = useDemoUserSwitcherStore(
    (s) => s.setSelectedSchoolSlug
  );

  React.useEffect(() => {
    setActiveTeam(teams[0]);
    setSelectedSchoolSlug(teams[0] ? teams[0].slug : null);
  }, [teams, setSelectedSchoolSlug]);

  if (loading) {
    return null;
  }

  if (fetchError) {
    return null;
  }

  if (!activeTeam) {
    return null;
  }

  const canSwitch = teams.length > 1;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="px-2 items-center">
        {canSwitch ? (
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) {
                // Delay to allow content to mount before focusing
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }
            }}
          >
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
            <div className="p-2 pb-0">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    const top = filteredTeams[0];
                    if (top) {
                      setActiveTeam(top);
                      setSelectedSchoolSlug(top.slug);
                      router.push(`/schools/${top.slug}/home`);
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search schools..."
                className="w-full px-2 py-1.5 text-sm rounded-md border bg-background"
                aria-label="Search schools"
              />
            </div>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Schools
              </DropdownMenuLabel>
            {filteredTeams.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">No schools found</div>
            )}
            {filteredTeams.map((team, index) => (
                <DropdownMenuItem key={team.name} asChild className="gap-2 p-2">
                  <Link
                    href={`/schools/${team.slug}/home`}
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
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href={`/schools`}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  View all schools
                </div>
              </Link>
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
