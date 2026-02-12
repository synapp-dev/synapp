"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { School, Search, X, Loader2 } from "lucide-react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import {
  useListSchoolsQuery,
  type School as SchoolServiceSchool,
} from "@/entities/school/model/useListSchoolsQuery";
import {
  useMySchoolsQuery,
  type School as MeSchool,
} from "@/entities/me/model/useMySchoolsQuery";
import { usePageTitle } from "@/hooks/use-page-title";
import { StorageImage } from "@/components/atoms/storage-image";

// Union type for both school types
type School = MeSchool | SchoolServiceSchool;

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower.includes(queryLower)) return true;

  // Fuzzy match: check if all characters in query appear in order in text
  let queryIndex = 0;
  for (
    let i = 0;
    i < textLower.length && queryIndex < queryLower.length;
    i++
  ) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

// Helper function to extract school metadata
function extractSchoolMetadata(school: School) {
  const st = (school as any)?.state;
  const stateText = st
    ? typeof st === "string"
      ? st.toUpperCase()
      : (st as any)?.code?.toUpperCase() || ""
    : "";

  const sector = (school as any)?.sector;
  const sectorText =
    typeof sector === "string"
      ? sector
      : sector && typeof sector === "object"
        ? (sector as any)?.name || ""
        : "";

  const lvls = (school as any)?.levels;
  let levelsText = "";
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

  return { stateText, sectorText, levelsText };
}

function SchoolsPageContent() {
  usePageTitle(["schools"]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAccess: isAdmin } = useFeatureAccess("system:admin-access");

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );
  const [stateFilter, setStateFilter] = useState<string>(
    searchParams?.get("state") || "all"
  );
  const [sectorFilter, setSectorFilter] = useState<string>(
    searchParams?.get("sector") || "all"
  );

  // Debounced search query for URL updates
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Update URL query parameters
  const updateQueryParams = useCallback(
    (updates: { search?: string; state?: string; sector?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
      }

      if (updates.state !== undefined) {
        if (updates.state !== "all") {
          params.set("state", updates.state);
        } else {
          params.delete("state");
        }
      }

      if (updates.sector !== undefined) {
        if (updates.sector !== "all") {
          params.set("sector", updates.sector);
        } else {
          params.delete("sector");
        }
      }

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Debounce search query updates (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      updateQueryParams({ search: searchQuery });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, updateQueryParams]);

  // Update URL immediately when state filter changes
  useEffect(() => {
    updateQueryParams({ state: stateFilter });
  }, [stateFilter, updateQueryParams]);

  // Update URL immediately when sector filter changes
  useEffect(() => {
    updateQueryParams({ sector: sectorFilter });
  }, [sectorFilter, updateQueryParams]);

  // Fetch schools based on user role
  const {
    data: adminSchools = [],
    isLoading: adminLoading,
    error: adminError,
  } = useListSchoolsQuery(
    { limit: 100 }, // Maximum allowed limit
    { enabled: isAdmin }
  );

  const {
    data: mySchools = [],
    isLoading: mySchoolsLoading,
    error: mySchoolsError,
  } = useMySchoolsQuery(
    { limit: 100 }, // Maximum allowed limit
    { enabled: !isAdmin }
  );

  const schools = isAdmin ? adminSchools : mySchools;
  const isLoading = isAdmin ? adminLoading : mySchoolsLoading;
  const error = isAdmin ? adminError : mySchoolsError;

  // Filter schools based on search and filters
  const filteredSchools = useMemo(() => {
    let filtered = schools;

    // Apply search filter (use debounced value)
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter((school) => {
        const name = school.name || "";
        const address = (school as any)?.address || "";
        const { stateText, sectorText, levelsText } =
          extractSchoolMetadata(school);
        const searchableText = [
          name,
          address,
          stateText,
          sectorText,
          levelsText,
        ].join(" ");

        return fuzzySearch(debouncedSearchQuery, searchableText);
      });
    }

    // Apply state filter
    if (stateFilter !== "all") {
      filtered = filtered.filter((school) => {
        const { stateText } = extractSchoolMetadata(school);
        return stateText === stateFilter.toUpperCase();
      });
    }

    // Apply sector filter
    if (sectorFilter !== "all") {
      filtered = filtered.filter((school) => {
        const { sectorText } = extractSchoolMetadata(school);
        const normalizedSector =
          typeof sectorText === "string"
            ? sectorText.toLowerCase()
            : sectorText;
        return normalizedSector === sectorFilter.toLowerCase();
      });
    }

    return filtered;
  }, [schools, debouncedSearchQuery, stateFilter, sectorFilter]);

  // Get unique states and sectors for filter options
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    schools.forEach((school) => {
      const { stateText } = extractSchoolMetadata(school);
      if (stateText) states.add(stateText);
    });
    return Array.from(states).sort();
  }, [schools]);

  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    schools.forEach((school) => {
      const { sectorText } = extractSchoolMetadata(school);
      if (sectorText) {
        const normalized =
          typeof sectorText === "string"
            ? sectorText.toLowerCase()
            : sectorText;
        sectors.add(normalized);
      }
    });
    return Array.from(sectors).sort();
  }, [schools]);

  const hasActiveFilters =
    debouncedSearchQuery.trim() !== "" ||
    stateFilter !== "all" ||
    sectorFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStateFilter("all");
    setSectorFilter("all");
  };

  const handleSchoolClick = (school: School) => {
    const slug = (school as any)?.slug;
    if (slug) {
      router.push(`/schools/${slug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: "#008993" }}
          >
            <School className="w-4 h-4 text-background" />
          </div>
          <h1 className="text-2xl font-semibold">Schools</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: "#008993" }}
          >
            <School className="w-4 h-4 text-background" />
          </div>
          <h1 className="text-2xl font-semibold">Schools</h1>
        </div>
        <div className="text-destructive">
          Error loading schools: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header and Search/Filters */}
      <div className="sticky top-16 z-10 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/90 -mx-6 px-6 border-b">
        {/* Header */}
        <div className="py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <School className="w-8 h-8 text-foreground" />
            <h1 className="text-2xl font-semibold">Schools</h1>
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 ml-2">
                {debouncedSearchQuery && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setSearchQuery("")}
                  >
                    Search: {debouncedSearchQuery}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {stateFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setStateFilter("all")}
                  >
                    State: {stateFilter}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {sectorFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setSectorFilter("all")}
                  >
                    Sector:{" "}
                    {sectorFilter.charAt(0).toUpperCase() + sectorFilter.slice(1)}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {schools.length > 1 && (
          <div className="pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-1/2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {availableStates.length > 0 && (
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {availableStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {availableSectors.length > 0 && (
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {availableSectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector.charAt(0).toUpperCase() + sector.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Schools Grid */}
      {filteredSchools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {hasActiveFilters
            ? "No schools found matching your filters."
            : "No schools available."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchools.map((school) => {
            const { stateText, sectorText, levelsText } =
              extractSchoolMetadata(school);
            const slug = (school as any)?.slug;
            const avatarUrl = (school as any)?.avatarUrl;
            const address = (school as any)?.address;

            return (
              <Card
                key={school.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSchoolClick(school)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {avatarUrl ? (
                      <StorageImage
                        src={avatarUrl}
                        alt={school.name || "School"}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#008993" }}
                      >
                        <School className="w-6 h-6 text-background" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{school.name}</CardTitle>
                      {address && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {address}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stateText && (
                          <Badge variant="outline" className="text-xs">
                            {stateText}
                          </Badge>
                        )}
                        {sectorText && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {typeof sectorText === "string"
                              ? sectorText
                              : (sectorText as any)?.name || ""}
                          </Badge>
                        )}
                        {levelsText && (
                          <Badge variant="outline" className="text-xs">
                            {levelsText}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: "#008993" }}
            >
              <School className="w-4 h-4 text-background" />
            </div>
            <h1 className="text-2xl font-semibold">Schools</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <SchoolsPageContent />
    </Suspense>
  );
}
