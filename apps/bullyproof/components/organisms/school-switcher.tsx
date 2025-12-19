"use client";

import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { Button } from "@workspace/ui/components/button";
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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  ArrowLeftRight,
  School as SchoolIcon,
  Check,
  Search as SearchIcon,
  Loader2,
  X as ClearIcon,
  MousePointer2,
  School,
  Pointer,
} from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  useMySchoolsQuery,
  type School as MeSchool,
} from "@/entities/me/model/useMySchoolsQuery";
import {
  useListSchoolsQuery,
  useSearchSchoolsQuery,
  type School as SchoolServiceSchool,
} from "@/entities/school/model/useListSchoolsQuery";
import { useIsPlatformAdmin } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";
import { cn } from "@workspace/ui/lib/utils";

// Union type for both school types
type School = MeSchool | SchoolServiceSchool;

export function SchoolSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [mounted, setMounted] = useState(false);
  const { state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  // School store
  const activeSchoolFromStore = useSchoolStore((s) => s.getActiveSchool());
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const lastAccessedSchool = useSchoolStore((s) => s.lastAccessedSchool);
  const setCurrentSchool = useSchoolStore((s) => s.setCurrentSchool);
  const setLastAccessedSchool = useSchoolStore((s) => s.setLastAccessedSchool);
  const clearCurrentSchool = useSchoolStore((s) => s.clearCurrentSchool);
  const clearLastAccessedSchool = useSchoolStore(
    (s) => s.clearLastAccessedSchool
  );

  // Handler to toggle school selection
  const handleSchoolToggle = useCallback(() => {
    if (selectedSchool) {
      // If clicking the same school, deselect it
      clearCurrentSchool();
      clearLastAccessedSchool();
      setSelectedSchool(null);
      router.push("/dashboard");
    }
  }, [selectedSchool, clearCurrentSchool, clearLastAccessedSchool, router]);

  // Check if user is platform admin or support
  const isPlatformAdmin = useIsPlatformAdmin();

  // no-op mount debug previously present

  // Fetch schools using TanStack Query based on user role
  const {
    data: mySchools = [],
    isLoading: mySchoolsLoading,
    error: mySchoolsError,
  } = useMySchoolsQuery(
    { limit: 5, random: true },
    { enabled: !isPlatformAdmin }
  );

  // Default list (no search)
  const {
    data: allSchools = [],
    isLoading: allSchoolsLoading,
    isFetching: allSchoolsFetching,
    error: allSchoolsError,
  } = useListSchoolsQuery({ limit: 5 }, { enabled: isPlatformAdmin });

  // Search list (separate cache and hook)
  const { data: searchedSchools = [], isFetching: searching } =
    useSearchSchoolsQuery(
      { query: debouncedSearch, limit: 5 },
      { enabled: isPlatformAdmin }
    );

  // Use the appropriate data based on role
  const adminSchools = debouncedSearch ? searchedSchools : allSchools;
  const schools = isPlatformAdmin ? adminSchools : mySchools;
  const isLoading = isPlatformAdmin ? allSchoolsLoading : mySchoolsLoading;
  const error = isPlatformAdmin ? allSchoolsError : mySchoolsError;

  // Check if user has access to only one school (based on base list, not search results)
  // This prevents the component from switching between popover and simple button during search
  const baseSchools = isPlatformAdmin ? allSchools : mySchools;
  const hasOnlyOneSchool = baseSchools.length === 1;

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep local selectedSchool in sync with store or URL context
  useEffect(() => {
    // Don't run during SSR or before mount
    if (!mounted) return;
    // Check if we're on a school page first
    const match = pathname?.match(/\/schools\/(.+?)(?:[/?#]|$)/);
    const slugFromPath = match ? decodeURIComponent(match[1]!) : null;

    if (slugFromPath && schools.length > 0) {
      // If on a school page, try to find the school from the list
      const fromList = schools.find(
        (s) =>
          typeof (s as any).slug === "string" &&
          (s as any).slug === slugFromPath
      );
      if (fromList) {
        setSelectedSchool(fromList);
        return;
      }
    }

    // If not on a school page, only use currentSchool (not lastAccessedSchool fallback)
    // This ensures deselected schools don't reappear
    if (currentSchool) {
      setSelectedSchool(currentSchool as School);
      return;
    }

    // Auto-select single school if user has only one school and none is selected
    if (
      hasOnlyOneSchool &&
      !currentSchool &&
      !slugFromPath &&
      baseSchools.length > 0 &&
      !isLoading
    ) {
      const singleSchool = baseSchools[0];
      if (singleSchool) {
        const schoolData = {
          id: singleSchool.id as string,
          name: singleSchool.name as string,
          slug: (singleSchool as any).slug as string,
          bannerUrl: (singleSchool as any).bannerUrl ?? null,
          avatarUrl: (singleSchool as any).avatarUrl ?? null,
          sector: (singleSchool as any).sector ?? null,
          levels: (singleSchool as any).levels ?? null,
          state: (singleSchool as any).state ?? null,
        };
        setCurrentSchool(schoolData);
        setSelectedSchool(singleSchool);
        // Navigate to the school's home page if not already on a school-specific page
        // Use setTimeout to ensure navigation happens after state updates and avoid SSR issues
        const slug =
          typeof (singleSchool as any).slug === "string"
            ? (singleSchool as any).slug
            : "";
        if (slug && typeof window !== "undefined") {
          // Use setTimeout to avoid navigation during render
          setTimeout(() => {
            router.push(`/schools/${slug}/home`);
          }, 0);
        }
        return;
      }
    }

    // If currentSchool is null, clear selection (don't use lastAccessedSchool)
    setSelectedSchool(null);
  }, [
    currentSchool,
    pathname,
    schools,
    hasOnlyOneSchool,
    baseSchools,
    setCurrentSchool,
    router,
    mounted,
    isLoading,
  ]);

  // Debug: log whenever the selected school changes
  useEffect(() => {
    if (selectedSchool) {
      console.log("SchoolSwitcher selectedSchool:", {
        id: (selectedSchool as any).id,
        name: (selectedSchool as any).name,
        slug: (selectedSchool as any).slug ?? null,
      });
      console.log(selectedSchool);
    } else {
      console.log("SchoolSwitcher selectedSchool: null");
    }
  }, [selectedSchool]);

  // Debounce search input by 300ms and only enable when length >= 2
  useEffect(() => {
    const handle = setTimeout(() => {
      const q = search.trim();
      setDebouncedSearch(q.length >= 2 ? q : "");
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      // Longer delay to ensure the popover and command components are fully rendered
      setTimeout(() => {
        const searchInput = document.querySelector(
          '[data-slot="command-input"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 200);
    }
  }, [open]);

  // Show loading state
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem className="items-center w-full flex pb-2 px-2">
          <SidebarMenuButton className="w-full flex items-center gap-2 justify-center group/school-switcher py-6">
            <div className="animate-pulse text-muted-foreground text-sm">
              Loading schools...
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Show error state
  if (error) {
    return (
      <SidebarMenu>
        <SidebarMenuItem className="items-center w-full flex pb-2 px-2">
          <SidebarMenuButton className="w-full flex items-center gap-2 justify-center group/school-switcher py-6">
            <div className="text-destructive text-sm">
              Error loading schools
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Show no schools state only when not searching
  const isSearchingAdmin = isPlatformAdmin && debouncedSearch.length > 0;
  if (!isSearchingAdmin) {
    const noAdminSchools = isPlatformAdmin && allSchools.length === 0;
    const noUserSchools = !isPlatformAdmin && mySchools.length === 0;
    if (noAdminSchools || noUserSchools) {
      return (
        <SidebarMenu>
          <SidebarMenuItem className="items-center w-full flex pb-2 px-2">
            <SidebarMenuButton className="w-full flex items-center gap-2 justify-center group/school-switcher py-6">
              <div className="text-muted-foreground text-sm">
                No schools available
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="items-center w-full flex pb-2 px-2">
        {hasOnlyOneSchool ? (
          // Simple display without popover when user has only one school
          <SidebarMenuButton
            tooltip={selectedSchool?.name || "School"}
            className="w-full flex items-center gap-2 justify-start group/school-switcher py-6"
            onClick={handleSchoolToggle}
          >
            {state === "expanded" ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Image
                  src={"https://i.imgur.com/8TMyB0x.png"}
                  alt={selectedSchool?.name || "School"}
                  width={100}
                  height={100}
                  className="object-cover w-5 h-auto opacity-100"
                />
                <div className="flex flex-col text-left -space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-medium truncate">
                    {selectedSchool?.name || "No school selected"}
                  </h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                    {(() => {
                      const st = (selectedSchool as any)?.state;
                      const stateText = st
                        ? typeof st === "string"
                          ? st.toUpperCase()
                          : (st as any)?.name || ""
                        : "";

                      // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
                      const sector = (selectedSchool as any)?.sector;
                      const sectorText =
                        typeof sector === "string"
                          ? sector
                          : sector && typeof sector === "object"
                            ? (sector as any)?.name || ""
                            : "";

                      // Handle levels: can be string[] (vSchoolsReadable) or object[] (vSchoolsEnriched)
                      const lvls = (selectedSchool as any)?.levels;
                      let levelsText = "";
                      if (Array.isArray(lvls) && lvls.length > 0) {
                        // Extract names if objects, or use strings directly
                        const levelNames = lvls.map((lvl) =>
                          typeof lvl === "string"
                            ? lvl
                            : (lvl as any)?.name || (lvl as any)?.key || ""
                        );
                        const lower = levelNames.map((s) => s.toLowerCase());
                        const hasPrimary = lower.some((s) =>
                          s.includes("primary")
                        );
                        const hasSecondary = lower.some((s) =>
                          s.includes("secondary")
                        );
                        if (hasPrimary && hasSecondary) levelsText = "P-12";
                        else if (hasPrimary) levelsText = "Primary";
                        else if (hasSecondary) levelsText = "Secondary";
                        else levelsText = levelNames.join(", ");
                      }

                      const parts = [stateText, sectorText, levelsText].filter(
                        Boolean
                      );

                      return parts.map((part, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <div className="truncate">{part}</div>
                          {index < parts.length - 1 && (
                            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <Image
                src={"https://i.imgur.com/8TMyB0x.png"}
                alt={selectedSchool?.name || "School"}
                width={32}
                height={32}
                className="object-contain w-6 h-auto"
              />
            )}
          </SidebarMenuButton>
        ) : (
          // Full popover functionality when user has multiple schools
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                tooltip={selectedSchool?.name || "Select school"}
                className="w-full flex items-center gap-2 justify-between group/school-switcher py-6"
              >
                {state === "expanded" ? (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {selectedSchool?.name ? (
                        <Image
                          src={"https://i.imgur.com/8TMyB0x.png"}
                          alt={selectedSchool?.name || "School"}
                          width={100}
                          height={100}
                          className="object-cover w-5 h-auto opacity-100"
                        />
                      ) : (
                        <School className="size-5 text-muted-foreground" />
                      )}

                      <div className="flex flex-col text-left -space-y-0.5 min-w-0 flex-1">
                        <h3
                          className={cn(
                            "font-medium truncate",
                            selectedSchool?.name
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {selectedSchool?.name || "Select a school!"}
                        </h3>
                        <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                          {(() => {
                            const st = (selectedSchool as any)?.state;
                            const stateText = st
                              ? typeof st === "string"
                                ? st.toUpperCase()
                                : (st as any)?.name || ""
                              : "";

                            // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
                            const sector = (selectedSchool as any)?.sector;
                            const sectorText =
                              typeof sector === "string"
                                ? sector
                                : sector && typeof sector === "object"
                                  ? (sector as any)?.name || ""
                                  : "";

                            // Handle levels: can be string[] (vSchoolsReadable) or object[] (vSchoolsEnriched)
                            const lvls = (selectedSchool as any)?.levels;
                            let levelsText = "";
                            if (Array.isArray(lvls) && lvls.length > 0) {
                              // Extract names if objects, or use strings directly
                              const levelNames = lvls.map((lvl) =>
                                typeof lvl === "string"
                                  ? lvl
                                  : (lvl as any)?.name ||
                                    (lvl as any)?.key ||
                                    ""
                              );
                              const lower = levelNames.map((s) =>
                                s.toLowerCase()
                              );
                              const hasPrimary = lower.some((s) =>
                                s.includes("primary")
                              );
                              const hasSecondary = lower.some((s) =>
                                s.includes("secondary")
                              );
                              if (hasPrimary && hasSecondary)
                                levelsText = "P-12";
                              else if (hasPrimary) levelsText = "Primary";
                              else if (hasSecondary) levelsText = "Secondary";
                              else levelsText = levelNames.join(", ");
                            }

                            const parts = [
                              stateText,
                              sectorText,
                              levelsText,
                            ].filter(Boolean);

                            return parts.map((part, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1"
                              >
                                <div className="truncate capitalize">
                                  {part}
                                </div>
                                {index < parts.length - 1 && (
                                  <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                    {selectedSchool?.name ? (
                      <ArrowLeftRight className="flex-shrink-0 group-hover/school-switcher:rotate-180 group-hover/school-switcher:animate-pulse transition-transform duration-300" />
                    ) : (
                      <MousePointer2 className="size-6 animate-bounce text-muted-foreground group-hover/school-switcher:text-primary group-hover/school-switcher:rotate-90 transition-transform duration-300" />
                    )}
                  </>
                ) : (
                  <Image
                    src={"https://i.imgur.com/8TMyB0x.png"}
                    alt={selectedSchool?.name || "School"}
                    width={32}
                    height={32}
                    className="object-contain w-6 h-auto"
                  />
                )}
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="right">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground">Change school</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  View all
                </Button>
              </div>
              <Command className="[&_[data-slot=command-input-wrapper]_svg]:hidden">
                {(() => {
                  const showSpinner =
                    isPlatformAdmin &&
                    search.trim().length >= 2 &&
                    (search !== debouncedSearch || searching);
                  const hasText = search.length > 0;
                  return (
                    <div className="relative">
                      <CommandInput
                        placeholder="Search schools..."
                        value={search}
                        onValueChange={setSearch}
                        className="pl-6 pr-8"
                      />
                      {showSpinner ? (
                        <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-slide-down-fade-in" />
                      )}
                      {hasText && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center rounded hover:bg-muted/60"
                          onClick={(e) => {
                            e.preventDefault();
                            setSearch("");
                            setDebouncedSearch("");
                          }}
                        >
                          <ClearIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })()}
                <CommandList>
                  {(() => {
                    // Check if we're currently searching/loading
                    const isSearching =
                      isPlatformAdmin &&
                      search.trim().length >= 2 &&
                      (search !== debouncedSearch || searching);
                    return (
                      <CommandEmpty>
                        {isSearching ? "Loading..." : "No schools found."}
                      </CommandEmpty>
                    );
                  })()}
                  {(() => {
                    // Helper function to render a school item
                    const renderSchoolItem = (
                      school: School,
                      isSelected: boolean
                    ) => {
                      const st = (school as any)?.state;
                      const stateText = st
                        ? typeof st === "string"
                          ? st.toUpperCase()
                          : (st as any)?.name || ""
                        : "";

                      // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
                      const sector = (school as any)?.sector;
                      const sectorText =
                        typeof sector === "string"
                          ? sector
                          : sector && typeof sector === "object"
                            ? (sector as any)?.name || ""
                            : "";

                      // Handle levels: can be string[] (vSchoolsReadable) or object[] (vSchoolsEnriched)
                      const lvls = (school as any)?.levels;
                      let levelsText = "";
                      if (Array.isArray(lvls) && lvls.length > 0) {
                        // Extract names if objects, or use strings directly
                        const levelNames = lvls.map((lvl) =>
                          typeof lvl === "string"
                            ? lvl
                            : (lvl as any)?.name || (lvl as any)?.key || ""
                        );
                        const lower = levelNames.map((s) => s.toLowerCase());
                        const hasPrimary = lower.some((s) =>
                          s.includes("primary")
                        );
                        const hasSecondary = lower.some((s) =>
                          s.includes("secondary")
                        );
                        if (hasPrimary && hasSecondary) levelsText = "P-12";
                        else if (hasPrimary) levelsText = "Primary";
                        else if (hasSecondary) levelsText = "Secondary";
                        else levelsText = levelNames.join(", ");
                      }

                      const parts = [stateText, sectorText, levelsText].filter(
                        Boolean
                      );

                      return (
                        <CommandItem
                          key={school.id}
                          value={school.name || ""}
                          onSelect={() => {
                            // If clicking the same school that's already selected, deselect it
                            if (isSelected) {
                              clearCurrentSchool();
                              clearLastAccessedSchool();
                              setSelectedSchool(null);
                              setOpen(false);
                              router.push("/dashboard");
                              return;
                            }

                            setSelectedSchool(school);
                            setOpen(false);
                            // Persist last accessed immediately for non-school pages
                            setLastAccessedSchool({
                              id: school.id as string,
                              name: school.name as string,
                              slug: (school as any).slug as string,
                              bannerUrl: (school as any).bannerUrl ?? null,
                              avatarUrl: (school as any).avatarUrl ?? null,
                            });
                            // Navigate to the school route
                            const slug =
                              typeof (school as any).slug === "string"
                                ? (school as any).slug
                                : "";
                            if (slug) {
                              router.push(`/schools/${slug}/home`);
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <SchoolIcon className="h-4 w-4" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium truncate">
                              {school.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {parts.map((part, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1"
                                >
                                  <span className="text-muted-foreground text-xs truncate capitalize">
                                    {part}
                                  </span>
                                  {index < parts.length - 1 && (
                                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      );
                    };

                    // Filter out selected school from the list if it exists
                    const filteredSchools = selectedSchool
                      ? schools.filter((s) => s.id !== selectedSchool.id)
                      : schools;

                    return (
                      <>
                        {/* Show selected school at the top if it exists */}
                        {selectedSchool && (
                          <CommandGroup heading="Current school">
                            {renderSchoolItem(selectedSchool, true)}
                          </CommandGroup>
                        )}
                        {/* Show remaining schools */}
                        {filteredSchools.length > 0 && (
                          <CommandGroup
                            heading={selectedSchool ? "Suggested" : undefined}
                          >
                            {filteredSchools.map((school) =>
                              renderSchoolItem(school, false)
                            )}
                          </CommandGroup>
                        )}
                      </>
                    );
                  })()}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
