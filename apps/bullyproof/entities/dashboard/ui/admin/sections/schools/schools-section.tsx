"use client";

import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SchoolsDataTable } from "./components/schools-data-table";
import { SchoolDetailDrawer } from "./components/school-detail-drawer";
import { AddSchoolWizard } from "./components/add-school-wizard";
import { type School } from "./components/schools-table-columns";
import { useSchools } from "@/entities/school/model/store";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, Loader2, Search, CircleX, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

function SchoolsSectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [stateFilter, setStateFilter] = useState(
    searchParams?.get("state") || "all"
  );
  const [sectorFilter, setSectorFilter] = useState(
    searchParams?.get("sector") || "all"
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams?.get("status") || "all"
  );
  const [typeFilter, setTypeFilter] = useState(
    searchParams?.get("type") || "all"
  );
  const isClosingRef = useRef(false);
  const isWizardClosingRef = useRef(false);

  // Use React Query hooks with Zustand caching for schools
  const {
    schools,
    isLoading,
    error: queryError,
    refetch: refetchSchools,
  } = useSchools({
    search: debouncedSearchQuery || undefined,
    state: stateFilter !== "all" ? stateFilter : undefined,
    sector: sectorFilter !== "all" ? sectorFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const error = queryError?.message || null;

  // Trigger background refetch on mount to ensure complete data
  // This ensures that even if we navigated from a page that only cached
  // partial data, we'll fetch all schools in the background while showing cached data
  useEffect(() => {
    // Refetch in the background without blocking the UI
    // The cached data will display immediately, and the UI will update when fresh data arrives
    refetchSchools();
  }, [refetchSchools]);

  // Extract slug from URL query parameter (e.g., ?school=mazenod-college-vic)
  const slugFromUrl = searchParams?.get("school") || null;
  // Extract modal from URL query parameter (e.g., ?modal=add-new-school)
  const modalFromUrl = searchParams?.get("modal") || null;
  // Extract tab from URL query parameter (e.g., ?tab=details)
  const tabFromUrl = searchParams?.get("tab") || null;

  // Redirect old "overview" to "details" and "settings" to "license" for backward compatibility
  useEffect(() => {
    if (tabFromUrl === "overview") {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("tab", "details");
      router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
    } else if (tabFromUrl === "settings") {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("tab", "license");
      router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  }, [tabFromUrl, router, searchParams]);

  // Memoize initialTab to prevent unnecessary re-renders
  const initialTab = useMemo(() => {
    // Handle backward compatibility: treat "overview" as "details" and "settings" as "license"
    const normalizedTab =
      tabFromUrl === "overview"
        ? "details"
        : tabFromUrl === "settings"
          ? "license"
          : tabFromUrl;

    if (
      normalizedTab &&
      [
        "onboarding",
        "activation",
        "details",
        "users",
        "classes",
        "activity",
        "culture",
        "license",
      ].includes(normalizedTab)
    ) {
      return normalizedTab as
        | "onboarding"
        | "activation"
        | "details"
        | "users"
        | "classes"
        | "activity"
        | "culture"
        | "license";
    }
    return undefined;
  }, [tabFromUrl]);

  // Debounce search query updates (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      } else {
        params.delete("search");
      }
      router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, router, searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (stateFilter !== "all") {
      params.set("state", stateFilter);
    } else {
      params.delete("state");
    }
    router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
  }, [stateFilter, router, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (sectorFilter !== "all") {
      params.set("sector", sectorFilter);
    } else {
      params.delete("sector");
    }
    router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
  }, [sectorFilter, router, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    } else {
      params.delete("status");
    }
    router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
  }, [statusFilter, router, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (typeFilter !== "all") {
      params.set("type", typeFilter);
    } else {
      params.delete("type");
    }
    router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
  }, [typeFilter, router, searchParams]);

  // Helper function to check if school matches type filter
  const matchesTypeFilter = (school: School, filter: string): boolean => {
    if (filter === "all") return true;

    if (!school.levels || school.levels.length === 0) {
      return false; // Schools without levels don't match any type filter
    }

    const normalizedLevels = school.levels
      .filter(
        (level): level is string => typeof level === "string" && level != null
      )
      .map((level) => level.toLowerCase().trim());

    const hasPrimary = normalizedLevels.some(
      (level) => level === "primary" || level.includes("primary")
    );
    const hasSecondary = normalizedLevels.some(
      (level) => level === "secondary" || level.includes("secondary")
    );

    if (filter === "primary") {
      // Show schools that have primary (including P-12 schools)
      return hasPrimary;
    } else if (filter === "secondary") {
      // Show schools that have secondary (including P-12 schools)
      return hasSecondary;
    } else if (filter === "p-12") {
      // Show only P-12 schools (schools with both primary and secondary)
      return hasPrimary && hasSecondary;
    }

    return true;
  };

  // Filter schools based on filter states
  const filteredSchools = schools.filter((school) => {
    // Search filter (name) - use debounced value
    if (
      debouncedSearchQuery &&
      !school.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ) {
      return false;
    }

    // State filter
    if (stateFilter !== "all" && school.state !== stateFilter) {
      return false;
    }

    // Sector filter
    if (sectorFilter !== "all" && school.sector !== sectorFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && school.status !== statusFilter) {
      return false;
    }

    // Type filter (primary/secondary/p-12)
    if (!matchesTypeFilter(school, typeFilter)) {
      return false;
    }

    return true;
  });

  // Get unique states and sectors from ALL schools for filter options
  const allUniqueStates = Array.from(
    new Set(schools.map((s) => s.state).filter(Boolean))
  ).sort() as string[];

  // Get states/sectors from CURRENT filtered schools (for enabling/disabling)
  const currentAvailableStates = new Set(
    filteredSchools.map((s) => s.state).filter(Boolean)
  );
  const currentAvailableSectors = new Set(
    filteredSchools.map((s) => s.sector).filter(Boolean)
  );
  const currentAvailableStatuses = new Set(
    filteredSchools.map((s) => s.status).filter(Boolean)
  );

  // All possible sectors and statuses
  const allSectors = ["government", "catholic", "independent"] as const;
  const allStatuses = [
    "active",
    "certification",
    "ready",
    "onboarding",
  ] as const;

  // Count schools for each filter option in current filtered results
  const getStateCount = (state: string) => {
    return filteredSchools.filter((school) => school.state === state).length;
  };

  const getSectorCount = (sector: string) => {
    return filteredSchools.filter((school) => school.sector === sector).length;
  };

  const getStatusCount = (status: string) => {
    return filteredSchools.filter((school) => school.status === status).length;
  };

  const hasActiveFilters =
    debouncedSearchQuery.trim() !== "" ||
    stateFilter !== "all" ||
    sectorFilter !== "all" ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStateFilter("all");
    setSectorFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    router.replace("/admin/schools", { scroll: false });
  };

  // Open drawer when URL has a slug query parameter
  useEffect(() => {
    // Don't interfere if we're manually closing the drawer
    if (isClosingRef.current) {
      return;
    }

    if (slugFromUrl && schools.length > 0) {
      const school = schools.find((s) => s.slug === slugFromUrl);
      if (school && selectedSchool?.id !== school.id) {
        setSelectedSchool(school);
        setIsDrawerOpen(true);
      } else if (!school && isDrawerOpen) {
        // School not found, close drawer
        setIsDrawerOpen(false);
        setSelectedSchool(null);
      }
    } else if (!slugFromUrl && isDrawerOpen) {
      // Close drawer if URL doesn't have slug (but only if not manually closing)
      setIsDrawerOpen(false);
      setSelectedSchool(null);
    }
  }, [
    slugFromUrl,
    schools,
    selectedSchool?.id,
    isDrawerOpen,
    router,
    searchParams,
  ]);

  // Open wizard when URL has modal=add-new-school query parameter
  useEffect(() => {
    // Don't interfere if we're manually closing the wizard
    if (isWizardClosingRef.current) {
      return;
    }

    if (modalFromUrl === "add-new-school") {
      if (!isWizardOpen) {
        setIsWizardOpen(true);
      }
    } else if (isWizardOpen) {
      // Close wizard if URL doesn't have modal param (but only if not manually closing)
      setIsWizardOpen(false);
    }
  }, [modalFromUrl, isWizardOpen]);

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
    setIsDrawerOpen(true);
    // Update URL query parameter to include school slug
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      // Remove modal param if present (only one modal/drawer open at a time)
      params.delete("modal");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const handleDrawerClose = (open: boolean) => {
    if (!open) {
      // Set flag to prevent useEffect from interfering
      isClosingRef.current = true;

      // Close drawer immediately
      setIsDrawerOpen(false);
      setSelectedSchool(null);

      // Update URL without scrolling
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("school");
      params.delete("tab");
      const newUrl = params.toString()
        ? `/admin/schools?${params.toString()}`
        : "/admin/schools";
      router.replace(newUrl, { scroll: false });

      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
    } else {
      setIsDrawerOpen(open);
    }
  };

  const handleAddSchoolClick = () => {
    setIsWizardOpen(true);
    // Update URL query parameter to include modal=add-new-school
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("modal", "add-new-school");
    // Remove school param if present (only one modal/drawer open at a time)
    params.delete("school");
    router.push(`/admin/schools?${params.toString()}`, { scroll: false });
  };

  const handleWizardClose = (open: boolean) => {
    if (!open) {
      // Set flag to prevent useEffect from interfering
      isWizardClosingRef.current = true;

      // Close wizard immediately
      setIsWizardOpen(false);

      // Update URL without scrolling
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("modal");
      const newUrl = params.toString()
        ? `/admin/schools?${params.toString()}`
        : "/admin/schools";
      router.replace(newUrl, { scroll: false });

      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isWizardClosingRef.current = false;
      }, 100);
    } else {
      setIsWizardOpen(open);
    }
  };

  const handleSchoolCreated = async (school: { slug: string | null }) => {
    if (!school.slug) {
      console.error("School created but no slug available");
      return;
    }

    // Set flag to prevent useEffect from interfering
    isWizardClosingRef.current = true;

    // Close wizard
    setIsWizardOpen(false);

    // Refresh schools list using React Query refetch
    try {
      const result = await refetchSchools();
      if (result.data) {
        // Find the newly created school by slug
        const newlyCreatedSchool = result.data.find(
          (s) => s.slug === school.slug
        );

        if (newlyCreatedSchool) {
          // Set the selected school and open the drawer explicitly
          setSelectedSchool(newlyCreatedSchool);
          setIsDrawerOpen(true);

          // Update URL: remove modal param, add school slug
          const params = new URLSearchParams(searchParams?.toString() || "");
          params.delete("modal");
          params.set("school", school.slug);
          router.push(`/admin/schools?${params.toString()}`, { scroll: false });
        }
      }
    } catch (err) {
      console.error("Failed to refresh schools:", err);
      // Still update URL even if refresh fails
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("modal");
      params.set("school", school.slug);
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    } finally {
      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isWizardClosingRef.current = false;
      }, 100);
    }
  };

  const handleTabChange = (
    tab:
      | "onboarding"
      | "activation"
      | "details"
      | "users"
      | "classes"
      | "activity"
      | "culture"
      | "license"
  ) => {
    // Update URL with tab parameter
    if (selectedSchool?.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", selectedSchool.slug);
      params.set("tab", tab);
      router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  // Use ref to track selectedSchool without causing callback recreation
  const selectedSchoolRef = useRef(selectedSchool);
  useEffect(() => {
    selectedSchoolRef.current = selectedSchool;
  }, [selectedSchool]);

  // Memoize onSchoolUpdate to prevent infinite loops
  const handleSchoolUpdate = useCallback(async () => {
    // Refresh schools list using React Query refetch
    try {
      const result = await refetchSchools();
      if (result.data) {
        // Update selected school if it exists - always update to get latest data
        const currentSelectedSchool = selectedSchoolRef.current;
        if (currentSelectedSchool) {
          const updatedSchool = result.data.find(
            (s) => s.id === currentSelectedSchool.id
          );
          if (updatedSchool) {
            setSelectedSchool(updatedSchool);

            // If slug changed (name was updated), update URL to match new slug
            if (
              updatedSchool.slug &&
              updatedSchool.slug !== currentSelectedSchool.slug
            ) {
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              params.set("school", updatedSchool.slug);
              // Preserve tab if present
              const currentTab = searchParams?.get("tab");
              if (currentTab) {
                params.set("tab", currentTab);
              }
              router.replace(`/admin/schools?${params.toString()}`, {
                scroll: false,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh schools:", err);
    }
  }, [refetchSchools, router, searchParams]);

  // Skeleton loader component
  const SkeletonTable = () => {
    const skeletonRows = Array.from({ length: 20 }, (_, i) => i);

    // Inject styles client-side only to avoid hydration errors
    useEffect(() => {
      const style = document.createElement("style");
      style.textContent = `
        [data-slot="scroll-area-viewport"] {
          overflow-y: scroll !important;
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        [data-slot="scroll-area-viewport"]::-webkit-scrollbar {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }, []);

    return (
      <div className="w-full h-full flex flex-col">
        <div className="rounded-md border flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="flex-shrink-0 border-b overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "28px" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left pl-1"></TableHead>
                    <TableHead className="text-right pl-1">Status</TableHead>
                    <TableHead className="text-left">School Name</TableHead>
                    <TableHead className="text-left">School Level</TableHead>
                    <TableHead className="text-left">State</TableHead>
                    <TableHead className="text-left">Sector</TableHead>
                    <TableHead className="text-right">Staff</TableHead>
                    <TableHead className="text-right">Teachers</TableHead>
                    <TableHead className="text-right">Classes</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
          </div>
          <div className="flex-1 h-full relative">
            <ScrollArea className="h-full w-full">
              <div className="pb-3">
                <Table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "28px" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <TableBody>
                    {skeletonRows.map((row) => (
                      <TableRow key={row} className="h-[56px]">
                        <TableCell className="pl-1 pr-1 py-2">
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right pl-1">
                          <Skeleton className="h-5 w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Spacer row to ensure last row is fully visible */}
                    <TableRow className="h-8 pointer-events-none">
                      <TableCell colSpan={9} className="p-0" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Add New School and Search/Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4 flex-shrink-0">
        {/* Add New School Button or Action Buttons - Left */}
        <div className="flex items-center gap-2 h-8">
          {Object.keys(rowSelection).length > 0 ? (
            <div
              className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                <span className="pl-4">
                  {
                    Object.keys(rowSelection).filter((key) => rowSelection[key])
                      .length
                  }
                </span>
                <Check className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAddSchoolClick}
              disabled={isLoading && schools.length === 0}
              className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
              style={{ animationFillMode: "forwards" }}
            >
              <Plus className="h-4 w-4" />
              Add New School
            </Button>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Search and Filters - Right */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 transition-all duration-200 ease-in-out">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 pr-10 transition-all duration-200 ease-in-out",
                debouncedSearchQuery.trim() &&
                  "border-orange-500 bg-orange-500/10"
              )}
              disabled={isLoading && schools.length === 0}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {searchQuery !== debouncedSearchQuery || isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <CircleX className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Select
              value={stateFilter || "all"}
              onValueChange={setStateFilter}
              disabled={isLoading && schools.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[140px]",
                  stateFilter &&
                    stateFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={isLoading && schools.length === 0}
              >
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {allUniqueStates.map((state) => {
                  const isAvailable = currentAvailableStates.has(state);
                  const isSelected = stateFilter === state;
                  const count = getStateCount(state);
                  return (
                    <SelectItem
                      key={state}
                      value={state}
                      disabled={!isAvailable && !isSelected}
                      className={
                        !isAvailable && !isSelected ? "opacity-50" : ""
                      }
                      title={
                        !isAvailable && !isSelected ? "No results" : undefined
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{state.toUpperCase()}</span>
                        {isAvailable && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {count}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={sectorFilter || "all"}
              onValueChange={setSectorFilter}
              disabled={isLoading && schools.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[140px]",
                  sectorFilter &&
                    sectorFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={isLoading && schools.length === 0}
              >
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {allSectors.map((sector) => {
                  const isAvailable = currentAvailableSectors.has(
                    sector as "government" | "catholic" | "independent"
                  );
                  const isSelected = sectorFilter === sector;
                  const sectorName =
                    sector.charAt(0).toUpperCase() + sector.slice(1);
                  const count = getSectorCount(sector);
                  return (
                    <SelectItem
                      key={sector}
                      value={sector}
                      disabled={!isAvailable && !isSelected}
                      className={
                        !isAvailable && !isSelected ? "opacity-50" : ""
                      }
                      title={
                        !isAvailable && !isSelected ? "No results" : undefined
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{sectorName}</span>
                        {isAvailable && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {count}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || "all"}
              onValueChange={setStatusFilter}
              disabled={isLoading && schools.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[140px]",
                  statusFilter &&
                    statusFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={isLoading && schools.length === 0}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {allStatuses.map((status) => {
                  const isAvailable = currentAvailableStatuses.has(
                    status as "active" | "certification" | "ready" | "onboarding"
                  );
                  const isSelected = statusFilter === status;
                  const statusName =
                    status.charAt(0).toUpperCase() + status.slice(1);
                  const count = getStatusCount(status);
                  return (
                    <SelectItem
                      key={status}
                      value={status}
                      disabled={!isAvailable && !isSelected}
                      className={
                        !isAvailable && !isSelected ? "opacity-50" : ""
                      }
                      title={
                        !isAvailable && !isSelected ? "No results" : undefined
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{statusName}</span>
                        {isAvailable && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {count}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter || "all"}
              onValueChange={setTypeFilter}
              disabled={isLoading && schools.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[140px]",
                  typeFilter &&
                    typeFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={isLoading && schools.length === 0}
              >
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="p-12">P-12</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Clear Filters Button */}
        <Button
          variant="outline"
          onClick={clearFilters}
          className={cn(
            "flex items-center gap-1",
            hasActiveFilters &&
              "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10 animate-pulse",
            !hasActiveFilters &&
              "text-muted-foreground hover:cursor-not-allowed"
          )}
          disabled={(isLoading && schools.length === 0) || !hasActiveFilters}
        >
          <CircleX className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && schools.length === 0 ? (
          <SkeletonTable />
        ) : (
          <SchoolsDataTable
            schools={filteredSchools}
            onSchoolClick={handleSchoolClick}
            isLoading={isLoading}
            error={error}
            onRowSelectionChange={setRowSelection}
          />
        )}
      </div>

      {/* Detail Drawer */}
      <SchoolDetailDrawer
        school={selectedSchool}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        initialTab={initialTab}
        onTabChange={handleTabChange}
        onSchoolUpdate={handleSchoolUpdate}
      />

      {/* Add School Wizard */}
      <AddSchoolWizard
        open={isWizardOpen}
        onOpenChange={handleWizardClose}
        onSchoolCreated={handleSchoolCreated}
      />
    </div>
  );
}

export function SchoolsSection() {
  usePageTitle(["admin", "schools"]);
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SchoolsSectionContent />
    </Suspense>
  );
}
