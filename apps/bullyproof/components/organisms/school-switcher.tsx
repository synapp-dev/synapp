"use client";

import { useState, useEffect } from "react";
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

// Union type for both school types
type School = MeSchool | SchoolServiceSchool;

export function SchoolSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const { state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  // School store
  const activeSchoolFromStore = useSchoolStore((s) => s.getActiveSchool());
  const setLastAccessedSchool = useSchoolStore((s) => s.setLastAccessedSchool);

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

  // Helpers to normalize sector and levels across different sources
  function getSectorText(school: any): string | null {
    const sector = school?.sector;
    if (!sector) return null;
    if (typeof sector === "string") return sector;
    if (typeof sector === "object" && "name" in sector && sector.name) {
      return String((sector as { name: string }).name);
    }
    return null;
  }

  function getLevelsText(school: any): string | null {
    const levels = school?.levels;
    if (!levels) return null;
    if (Array.isArray(levels)) {
      if (levels.length === 0) return null;
      // If array of strings (from v_schools_readable)
      if (typeof levels[0] === "string") {
        return (levels as string[]).join(", ");
      }
      // If array of objects with name (from v_schools_enriched)
      if (typeof levels[0] === "object" && levels[0] && "name" in levels[0]) {
        return (levels as Array<{ name: string }>)
          .map((l) => l.name)
          .filter(Boolean)
          .join(", ");
      }
    }
    return null;
  }

  function getStateText(school: any): string | null {
    const state = school?.state;
    if (!state) return null;
    if (typeof state === "string") return state.toUpperCase();
    if (typeof state === "object" && "name" in state && (state as any).name) {
      return String((state as { name: string }).name);
    }
    return null;
  }

  function getLevelsLabel(school: any): string | null {
    const raw = school?.levels;
    if (!Array.isArray(raw)) return null;
    const names = (
      typeof raw[0] === "string"
        ? (raw as string[])
        : (raw as Array<{ name?: string }>).map((l) => l?.name || "")
    ).map((s) => s.toLowerCase());
    const hasPrimary = names.some((n) => n.includes("primary"));
    const hasSecondary = names.some((n) => n.includes("secondary"));
    if (hasPrimary && hasSecondary) return "P-12";
    if (hasPrimary) return "Primary";
    if (hasSecondary) return "Secondary";
    const text = getLevelsText(school);
    return text ? text : null;
  }

  // Keep local selectedSchool in sync with store or URL context
  useEffect(() => {
    // Prefer store active school if available
    if (activeSchoolFromStore) {
      setSelectedSchool(activeSchoolFromStore as School);
      return;
    }

    // If on a /schools/[slug] path but store not yet hydrated, try to infer from list
    const match = pathname?.match(/\/schools\/(.+?)(?:[/?#]|$)/);
    const slugFromPath = match ? decodeURIComponent(match[1]!) : null;
    if (slugFromPath && schools.length > 0) {
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

    // Otherwise do not force-select; keep whatever is currently selected
  }, [activeSchoolFromStore, pathname, schools]);

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              tooltip={selectedSchool?.name || "Select school"}
              className="w-full flex items-center gap-2 justify-between group/school-switcher py-6"
            >
              {state === "expanded" ? (
                <>
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
                        {/* State */}
                        <div className="truncate">
                          {(() => {
                            const st = (selectedSchool as any)?.state;
                            if (!st) return "";
                            return typeof st === "string"
                              ? st.toUpperCase()
                              : (st as any)?.name || "";
                          })()}
                        </div>
                        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                        {/* Sector */}
                        <div className="truncate capitalize">
                          {String(
                            ((selectedSchool as any)?.sector ?? "") as string
                          )}
                        </div>
                        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                        {/* Levels */}
                        <div className="truncate">
                          {(() => {
                            const lvls = (selectedSchool as any)?.levels as
                              | string[]
                              | undefined;
                            if (!Array.isArray(lvls) || lvls.length === 0)
                              return "";
                            const lower = lvls.map((s) => s.toLowerCase());
                            const hasPrimary = lower.some((s) =>
                              s.includes("primary")
                            );
                            const hasSecondary = lower.some((s) =>
                              s.includes("secondary")
                            );
                            if (hasPrimary && hasSecondary) return "P-12";
                            if (hasPrimary) return "Primary";
                            if (hasSecondary) return "Secondary";
                            return lvls.join(", ");
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowLeftRight className="flex-shrink-0 group-hover/school-switcher:rotate-180 group-hover/school-switcher:animate-pulse transition-transform duration-300" />
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
                <CommandEmpty>No schools found.</CommandEmpty>
                <CommandGroup>
                  {/* Keep previous items visible while searching; spinner is inside input */}
                  {schools.map((school) => (
                    <CommandItem
                      key={school.id}
                      value={school.name || ""}
                      onSelect={() => {
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
                          <span className="text-muted-foreground text-xs truncate">
                            {(() => {
                              const st = (school as any)?.state;
                              if (!st) return "";
                              return typeof st === "string"
                                ? st.toUpperCase()
                                : (st as any)?.name || "";
                            })()}
                          </span>
                          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                          <span className="text-muted-foreground text-xs truncate capitalize">
                            {String(((school as any)?.sector ?? "") as string)}
                          </span>
                          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                          <span className="text-muted-foreground text-xs truncate">
                            {(() => {
                              const lvls = (school as any)?.levels as
                                | string[]
                                | undefined;
                              if (!Array.isArray(lvls) || lvls.length === 0)
                                return "";
                              const lower = lvls.map((s) => s.toLowerCase());
                              const hasPrimary = lower.some((s) =>
                                s.includes("primary")
                              );
                              const hasSecondary = lower.some((s) =>
                                s.includes("secondary")
                              );
                              if (hasPrimary && hasSecondary) return "P-12";
                              if (hasPrimary) return "Primary";
                              if (hasSecondary) return "Secondary";
                              return lvls.join(", ");
                            })()}
                          </span>
                        </div>
                      </div>
                      {selectedSchool?.id === school.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
