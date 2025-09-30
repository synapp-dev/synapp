"use client";

import * as React from "react";
import { ArrowLeftRight, Plus, School } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

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
import { Badge } from "@workspace/ui/components/badge";

import { createBrowserClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";
import { useDemoUserSwitcherStore } from "@/stores/demo-user-switcher-store";

export function SchoolSwitcher() {
  const { isMobile } = useSidebar();
  const selectedRole = useDemoUserSwitcherStore((s) => s.selectedUser);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const params = useParams<{ school_id?: string }>();

  const [schools, setSchools] = React.useState<
    Array<Tables<"v_schools_readable">>
  >([]);
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
        .from("v_schools_readable")
        .select("*");
      if (!isMounted) return;
      if (error) {
        setFetchError(error.message);
        setSchools([]);
      } else {
        setSchools(
          (data ?? []).filter((s): s is Tables<"v_schools_readable"> =>
            Boolean(s?.id)
          )
        );
      }
      setLoading(false);
    }
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const schoolsList = React.useMemo(
    () =>
      (schools ?? [])
        .filter(
          (
            s
          ): s is Tables<"v_schools_readable"> & { name: string; id: string } =>
            Boolean(s?.name && s?.id)
        )
        .map((s) => ({
          name: s.name,
          slug: s.slug ?? s.id,
          logo: School,
          sector: s.sector,
          levels: s.levels,
        })),
    [schools]
  );

  const filteredSchools = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schoolsList.slice(0, 5);
    const score = (s: { name: string; slug: string }) => {
      const name = s.name.toLowerCase();
      const slug = s.slug.toLowerCase();
      const nameIdx = name.indexOf(q);
      const slugIdx = slug.indexOf(q);
      const bestIdx = Math.min(
        nameIdx === -1 ? Infinity : nameIdx,
        slugIdx === -1 ? Infinity : slugIdx
      );
      if (bestIdx === Infinity) return Infinity;
      return bestIdx;
    };
    return schoolsList
      .map((s) => ({ s, score: score(s) }))
      .filter((x) => x.score !== Infinity)
      .sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name))
      .slice(0, 5)
      .map((x) => x.s);
  }, [schoolsList, query]);

  const [activeSchool, setActiveSchool] = React.useState(schoolsList[0]);

  const setSelectedSchoolSlug = useDemoUserSwitcherStore(
    (s) => s.setSelectedSchoolSlug
  );

  React.useEffect(() => {
    const slug =
      typeof params?.school_id === "string" ? params.school_id : undefined;
    const nextActive =
      (slug ? schoolsList.find((s) => s.slug === slug) : undefined) ??
      schoolsList[0];
    setActiveSchool(nextActive);
    setSelectedSchoolSlug(nextActive ? nextActive.slug : null);
  }, [params, schoolsList, setSelectedSchoolSlug]);

  if (loading) {
    return null;
  }

  if (fetchError) {
    return null;
  }

  if (!activeSchool) {
    return null;
  }

  const canSwitch = schoolsList.length > 1;

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
                  <activeSchool.logo className="size-4" />
                </div>
                <div className="flex flex-1 flex-col text-left -space-y-1 text-sm leading-tight min-w-0 max-w-[calc(100%-3rem)]">
                  <span className="truncate font-medium">
                    {activeSchool.name}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1 items-center">
                    {activeSchool.sector && (
                      <span className="text-[0.625rem] capitalize text-muted-foreground">
                        {activeSchool.sector}
                      </span>
                    )}
                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                    {activeSchool.levels?.map((level, index) => (
                      <span
                        key={index}
                        className="text-[0.625rem] capitalize text-muted-foreground"
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowLeftRight />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 min-w-80 rounded-lg"
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
                      const top = filteredSchools[0];
                      if (top) {
                        setActiveSchool(top);
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
              {filteredSchools.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No schools found
                </div>
              )}
              {filteredSchools.map((school, index) => (
                <DropdownMenuItem
                  key={school.name}
                  asChild
                  className="gap-2 p-2"
                >
                  <Link
                    href={`/schools/${school.slug}/home`}
                    onClick={() => {
                      setActiveSchool(school);
                      setSelectedSchoolSlug(school.slug);
                    }}
                    className="flex items-center gap-2 w-full"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <school.logo className="size-3.5 shrink-0" />
                    </div>
                    <div className="flex flex-1 flex-col min-w-0 -space-y-1">
                      <span className="truncate font-medium">
                        {school.name}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1 items-center">
                        {school.sector && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {school.sector}
                          </span>
                        )}
                        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                        {school.levels?.slice(0, 2).map((level, levelIndex) => (
                          <span
                            key={levelIndex}
                            className="text-xs text-muted-foreground capitalize"
                          >
                            {level}
                          </span>
                        ))}
                        {school.levels && school.levels.length > 2 && (
                          <span className="text-xs text-muted-foreground capitalize">
                            +{school.levels.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2 p-2">
                <Link href={`/schools`}>
                  {/* <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div> */}
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
              <activeSchool.logo className="size-4" />
            </div>
            <div className="flex flex-1 flex-col text-left text-sm leading-tight min-w-0">
              <span className="truncate font-medium">{activeSchool.name}</span>
              <div className="flex flex-wrap gap-1 mt-1 items-center">
                {activeSchool.sector && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {activeSchool.sector}
                  </span>
                )}
                <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                {activeSchool.levels?.slice(0, 2).map((level, index) => (
                  <span
                    key={index}
                    className="text-xs text-muted-foreground capitalize"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>
            {/* <ArrowLeftRight /> */}
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
