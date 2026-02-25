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
  Check,
  Search as SearchIcon,
  Loader2,
  X as ClearIcon,
  MousePointer2,
  School,
  Pointer,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import {
  useMySchoolsQuery,
  useSchoolsForUserQuery,
  type School as MeSchool,
} from "@/entities/me/model/useMySchoolsQuery";
import {
  useListSchoolsQuery,
  useSearchSchoolsQuery,
  type School as SchoolServiceSchool,
} from "@/entities/school/model/useListSchoolsQuery";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useSchoolStore } from "@/stores/school-store";
import { useMeStore } from "@/entities/me/model/store";
import { cn } from "@workspace/ui/lib/utils";
import { StorageImage } from "@/components/atoms/storage-image";

// Union type for both school types
type School = MeSchool | SchoolServiceSchool;

// Helper function to extract school metadata (state, sector, levels)
function extractSchoolMetadata(school: School | null) {
  if (!school) {
    return { stateText: "", sectorText: "", levelsText: "" };
  }

  const st = (school as any)?.state;
  const stateText = st
    ? typeof st === "string"
      ? st.toUpperCase()
      : (st as any)?.code?.toUpperCase() || ""
    : "";

  // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
  const sector = (school as any)?.sector;
  const sectorText =
    typeof sector === "string"
      ? sector
      : sector && typeof sector === "object"
        ? (sector as any)?.name || ""
        : "";

  // Prefer levelBadge (from school_year_assignments: P-10, P-12, Primary, Secondary, Custom)
  const levelBadge = (school as any)?.levelBadge ?? (school as any)?.level_badge;
  let levelsText = "";
  if (levelBadge && typeof levelBadge === "string") {
    levelsText = levelBadge;
  } else {
    const lvls = (school as any)?.levels;
    if (Array.isArray(lvls) && lvls.length > 0) {
      const levelNames = lvls.map((lvl) =>
        typeof lvl === "string"
          ? lvl
          : (lvl as any)?.name || (lvl as any)?.key || ""
      );
      const lower = levelNames.map((s) => s.toLowerCase());
      const hasPrimary = lower.some((s) => s.includes("primary"));
      const hasSecondary = lower.some((s) => s.includes("secondary"));
      if (hasPrimary && hasSecondary) levelsText = "P-12";
      else if (hasPrimary) levelsText = "Primary";
      else if (hasSecondary) levelsText = "Secondary";
      else levelsText = levelNames.join(", ");
    }
  }

  return { stateText, sectorText, levelsText };
}

// Component for school icon with teal background (fallback when no avatar)
function SchoolIconBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const containerSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div
      className={`${containerSize} rounded flex items-center aspect-square justify-center`}
      style={{ backgroundColor: "#008993" }}
    >
      <School className={`${iconSize} text-background`} />
    </div>
  );
}

// Component for active school: avatar if URL exists, otherwise placeholder badge
function SchoolAvatarOrBadge({
  school,
  size = "md",
}: {
  school: School | null;
  size?: "sm" | "md";
}) {
  const avatarUrl = school ? (school as any).avatarUrl ?? null : null;

  if (avatarUrl) {
    const widthPx = size === "sm" ? 22 : 29;
    const widthClass = size === "sm" ? "w-5" : "w-7";
    return (
      <div className={`${widthClass} flex-shrink-0 ml-1`}>
        <StorageImage
          src={avatarUrl}
          alt={school?.name || "School"}
          width={widthPx}
          height={widthPx}
          className="w-full h-auto rounded object-contain"
          style={{ width: widthPx, height: "auto" }}
        />
      </div>
    );
  }

  return <SchoolIconBadge size={size} />;
}

// Component for displaying school metadata (state, sector, levels)
function SchoolMetadata({
  school,
  className = "",
  capitalize = false,
}: {
  school: School | null;
  className?: string;
  capitalize?: boolean;
}) {
  const { stateText, sectorText, levelsText } = extractSchoolMetadata(school);
  const parts = [stateText, sectorText, levelsText].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 text-muted-foreground text-[0.65rem] ${className}`}
    >
      {parts.map((part, index) => (
        <div key={index} className="flex items-center gap-1">
          <div className={cn("truncate", capitalize && "capitalize")}>
            {part}
          </div>
          {index < parts.length - 1 && (
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          )}
        </div>
      ))}
    </div>
  );
}

// Wrapper component for loading/error/empty states
function StateWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="items-center w-full flex pb-2">
        <SidebarMenuButton className="w-full flex items-center gap-2 justify-center group/school-switcher py-6">
          {children}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SchoolSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [mounted, setMounted] = useState(false);
  const { state, isMobile } = useSidebar();
  // On mobile, always render as expanded
  const displayState = isMobile ? "expanded" : state;
  const router = useRouter();
  const pathname = usePathname();
  const viewAsUser = useMeStore((s) => s.viewAsUser);
  const isViewMode = !!viewAsUser;

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

  // Users with admin_schools can load and search all schools; others see only their schools
  const { hasAccess: canAccessAllSchools } = useFeatureAccess("/admin/schools");
  const canAccessAllSchoolsForSwitcher = canAccessAllSchools && !isViewMode;

  // Fetch schools using TanStack Query based on feature access
  const {
    data: mySchools = [],
    isLoading: mySchoolsLoading,
    error: mySchoolsError,
  } = useMySchoolsQuery(
    { limit: 5, random: true },
    { enabled: !canAccessAllSchoolsForSwitcher && !isViewMode }
  );

  // In view mode, always scope schools to the selected user assignments.
  const {
    data: viewAsSchools = [],
    isLoading: viewAsSchoolsLoading,
    error: viewAsSchoolsError,
  } = useSchoolsForUserQuery(viewAsUser?.id ?? "", { limit: 100 });

  // Default list (no search)
  const {
    data: allSchools = [],
    isLoading: allSchoolsLoading,
    isFetching: allSchoolsFetching,
    error: allSchoolsError,
  } = useListSchoolsQuery({ limit: 5 }, { enabled: canAccessAllSchoolsForSwitcher });

  // Search list (separate cache and hook)
  const { data: searchedSchools = [], isFetching: searching } =
    useSearchSchoolsQuery(
      { query: debouncedSearch, limit: 5 },
      { enabled: canAccessAllSchoolsForSwitcher }
    );

  // Use the appropriate data based on feature access
  const adminSchools = debouncedSearch ? searchedSchools : allSchools;
  const schools = isViewMode
    ? viewAsSchools
    : canAccessAllSchoolsForSwitcher
      ? adminSchools
      : mySchools;
  const isLoading = isViewMode
    ? viewAsSchoolsLoading
    : canAccessAllSchoolsForSwitcher
      ? allSchoolsLoading
      : mySchoolsLoading;
  const error = isViewMode
    ? viewAsSchoolsError
    : canAccessAllSchoolsForSwitcher
      ? allSchoolsError
      : mySchoolsError;

  // Check if user has access to only one school (based on base list, not search results)
  // This prevents the component from switching between popover and simple button during search
  const baseSchools = isViewMode
    ? viewAsSchools
    : canAccessAllSchoolsForSwitcher
      ? allSchools
      : mySchools;
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
      // Prefer currentSchool from store when it matches - it has full data (avatarUrl, etc.)
      // from SchoolStoreProvider/useSchoolBySlugQuery. The schools list (mySchools) uses
      // vSchoolsEnriched which lacks avatarUrl.
      const storeSlug = currentSchool?.slug;
      if (currentSchool && storeSlug === slugFromPath) {
        setSelectedSchool(currentSchool as School);
        return;
      }
      // Fall back to finding from the list
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
    if (
      currentSchool &&
      (!isViewMode || schools.some((school) => school.id === currentSchool.id))
    ) {
      setSelectedSchool(currentSchool as School);
      return;
    }

    // Auto-select single school if user has only one school and none is selected
    // Load school into store but do NOT automatically redirect - user stays on current page
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
    isViewMode,
    setCurrentSchool,
    mounted,
    isLoading,
    schools,
  ]);

  // In view mode, keep school store consistent with the viewed user's assignments.
  useEffect(() => {
    if (!isViewMode || !currentSchool) return;
    const isAssignedToViewedUser = schools.some(
      (school) => school.id === currentSchool.id
    );
    if (!isAssignedToViewedUser) {
      clearCurrentSchool();
      setSelectedSchool(null);
    }
  }, [isViewMode, currentSchool, schools, clearCurrentSchool]);

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

  // Handler for school selection/deselection in popover
  const handleSchoolSelect = useCallback(
    (school: School, isSelected: boolean) => {
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
        typeof (school as any).slug === "string" ? (school as any).slug : "";
      if (slug) {
        router.push(`/schools/${slug}/home`);
      }
    },
    [clearCurrentSchool, clearLastAccessedSchool, router, setLastAccessedSchool]
  );

  // Show loading state
  if (isLoading) {
    return (
      <StateWrapper>
        <div className="animate-pulse text-muted-foreground text-sm">
          Loading schools...
        </div>
      </StateWrapper>
    );
  }

  // Show error state
  if (error) {
    return (
      <StateWrapper>
        <div className="text-destructive text-sm">Error loading schools</div>
      </StateWrapper>
    );
  }

  // Show no schools state only when not searching
  const isSearchingAdmin =
    canAccessAllSchoolsForSwitcher && debouncedSearch.length > 0;
  if (!isSearchingAdmin) {
    const noAdminSchools =
      canAccessAllSchoolsForSwitcher && allSchools.length === 0;
    const noUserSchools =
      !canAccessAllSchoolsForSwitcher && !isViewMode && mySchools.length === 0;
    const noViewAsSchools = isViewMode && viewAsSchools.length === 0;
    if (noAdminSchools || noUserSchools || noViewAsSchools) {
      return (
        <StateWrapper>
          <div className="text-muted-foreground text-sm">
            No schools available
          </div>
        </StateWrapper>
      );
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem
        className={cn(
          "items-center w-full flex pb-2",
          displayState === "expanded" ? "" : "pl-2"
        )}
      >
        {hasOnlyOneSchool ? (
          // Simple display without popover when user has only one school
          <SidebarMenuButton
            tooltip={selectedSchool?.name || "School"}
            className={cn(
              "w-full flex items-center gap-2 group/school-switcher py-6",
              displayState === "expanded" ? "justify-start" : "justify-center"
            )}
            onClick={handleSchoolToggle}
          >
            {displayState === "expanded" ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <SchoolAvatarOrBadge school={selectedSchool} size="md" />
                <div className="flex flex-col text-left -space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-medium truncate">
                    {selectedSchool?.name || "No school selected"}
                  </h3>
                  <SchoolMetadata school={selectedSchool} />
                </div>
              </div>
            ) : (
              <SchoolAvatarOrBadge school={selectedSchool} size="sm" />
            )}
          </SidebarMenuButton>
        ) : (
          // Full popover functionality when user has multiple schools
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                tooltip={selectedSchool?.name || "Select school"}
                className={cn(
                  "w-full flex items-center gap-2 group/school-switcher py-6",
                  displayState === "expanded" ? "justify-between" : "justify-center"
                )}
              >
                {displayState === "expanded" ? (
                  <>
                    <div
                      className={cn(
                        "flex items-center gap-2 min-w-0 max-w-[80%]",
                        selectedSchool?.name ? "" : "mx-2"
                      )}
                    >
                      {selectedSchool?.name ? (
                        <div className="flex-shrink-0">
                          <SchoolAvatarOrBadge school={selectedSchool} size="md" />
                        </div>
                      ) : (
                        <School className="size-4 text-muted-foreground flex-shrink-0" />
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
                        <SchoolMetadata school={selectedSchool} capitalize />
                      </div>
                    </div>
                    {selectedSchool?.name ? (
                      <ArrowLeftRight className="flex-shrink-0 group-hover/school-switcher:rotate-180 group-hover/school-switcher:animate-pulse transition-transform duration-300 mr-1" />
                    ) : (
                      <MousePointer2 className="size-6 animate-bounce text-muted-foreground group-hover/school-switcher:text-primary group-hover/school-switcher:rotate-90 transition-transform duration-300 flex-shrink-0 mr-1" />
                    )}
                  </>
                ) : (
                  <SchoolAvatarOrBadge school={selectedSchool} size="sm" />
                )}
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="right">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground">Change school</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setOpen(false);
                    router.push("/schools");
                  }}
                >
                  View all
                </Button>
              </div>
              <Command className="[&_[data-slot=command-input-wrapper]_svg]:hidden">
                {(() => {
                  const showSpinner =
                    canAccessAllSchoolsForSwitcher &&
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
                      canAccessAllSchoolsForSwitcher &&
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
                      const { stateText, sectorText, levelsText } =
                        extractSchoolMetadata(school);
                      const parts = [stateText, sectorText, levelsText].filter(
                        Boolean
                      );

                      return (
                        <CommandItem
                          key={school.id}
                          value={school.name || ""}
                          onSelect={() =>
                            handleSchoolSelect(school, isSelected)
                          }
                          className="flex items-center gap-2"
                        >
                          <SchoolAvatarOrBadge school={school} size="sm" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium truncate">
                              {school.name}
                            </span>
                            {parts.length > 0 && (
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
                            )}
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
