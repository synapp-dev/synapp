import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolApi } from "../api/endpoints";
import { schoolKeys } from "./keys";
import type { vSchoolsReadable } from "@/drizzle/schema";

// School type matching the admin schools page format
export type School = {
  id: string;
  name: string;
  state: string | null;
  sector: "government" | "catholic" | "independent" | null;
  teacherCount: number;
  classCount: number;
  schoolAdminCount: number;
  schoolLicenceCount: number;
  staffCount?: number;
  activeLicence: boolean;
  status: "onboarding" | "active";
  slug: string | null;
  levels?: string[] | null;
  levelBadge?: string | null;
};

interface SchoolsState {
  // Normalized cache: schoolId -> School
  schools: Record<string, School>;
  // List of school IDs (for maintaining order)
  schoolIds: string[];

  // Actions
  setSchools: (schools: School[]) => void;
  setSchool: (school: School) => void;
  removeSchool: (schoolId: string) => void;
  clearSchools: () => void;
}

export const useSchoolsStore = create<SchoolsState>((set) => ({
  schools: {},
  schoolIds: [],

  setSchools: (schools) =>
    set({
      schools: schools.reduce(
        (acc, school) => {
          acc[school.id] = school;
          return acc;
        },
        {} as Record<string, School>
      ),
      schoolIds: schools.map((s) => s.id),
    }),

  setSchool: (school) =>
    set((state) => {
      const newSchools = { ...state.schools, [school.id]: school };
      const newSchoolIds = state.schoolIds.includes(school.id)
        ? state.schoolIds
        : [...state.schoolIds, school.id];
      return { schools: newSchools, schoolIds: newSchoolIds };
    }),

  removeSchool: (schoolId) =>
    set((state) => {
      const { [schoolId]: removed, ...schools } = state.schools;
      return {
        schools,
        schoolIds: state.schoolIds.filter((id) => id !== schoolId),
      };
    }),

  clearSchools: () => set({ schools: {}, schoolIds: [] }),
}));

// Helper function to transform API school data to School type
function transformSchoolData(school: any): School {
  const teacherCount = school.teacherCount ?? 0;
  const classCount = school.classCount ?? 0;
  const schoolAdminCount = school.schoolAdminCount ?? 0;
  const schoolLicenceCount = school.schoolLicenceCount ?? 0;
  const activeLicence =
    school.activeLicence ?? school.active_licence ?? false;

  // Status: onboarding if any count < 1, active if all counts >= 1
  const status: "onboarding" | "active" =
    teacherCount < 1 ||
    classCount < 1 ||
    schoolAdminCount < 1 ||
    schoolLicenceCount < 1
      ? "onboarding"
      : "active";

  return {
    id: school.id || "",
    name: school.name || "",
    state: school.state || null,
    sector: school.sector || null,
    teacherCount,
    classCount,
    schoolAdminCount,
    schoolLicenceCount,
    staffCount: school.staffCount ?? 0,
    activeLicence,
    status,
    slug: school.slug || null,
    levels: school.levels || null,
    levelBadge: school.levelBadge ?? school.level_badge ?? null,
  };
}

// React Query hook for fetching all schools (with pagination support)
// Note: Client-side filtering is handled by the component, so we fetch all schools
// and cache them. Only search filter is passed to the API for server-side filtering.
export function useSchools(filters?: {
  search?: string;
  state?: string;
  sector?: string;
  status?: string;
  type?: string;
}) {
  const queryClient = useQueryClient();
  const { schools, schoolIds, setSchools } = useSchoolsStore();

  // Only use search filter for API call (server-side filtering)
  // Other filters (state, sector, status, type) are handled client-side by the component
  const searchFilter = filters?.search && filters.search !== "" ? filters.search : undefined;
  const hasSearchFilter = !!searchFilter;

  const query = useQuery({
    queryKey: schoolKeys.listSchools({ search: searchFilter }),
    queryFn: async () => {
      // Fetch all schools in batches (max limit is 100 per API)
      const allSchools: School[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const result = await schoolApi.get.listSchools({
          limit,
          offset,
          search: searchFilter,
        });

        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch schools");
        }

        if (result.data) {
          const mappedSchools = result.data.map(transformSchoolData);
          allSchools.push(...mappedSchools);

          // If we got fewer than the limit, we've fetched all schools
          if (mappedSchools.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }

      // Update Zustand store with normalized data
      setSchools(allSchools);
      return allSchools;
    },
    staleTime: hasSearchFilter ? 0 : 2 * 60 * 1000, // Always refetch when search filter changes, cache unfiltered for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    // Use initialData from Zustand if available for immediate display (only if no search filter)
    initialData: hasSearchFilter
      ? undefined
      : () => {
          const zustandSchools = schoolIds.map((id) => schools[id]).filter(Boolean);
          return zustandSchools.length > 0 ? zustandSchools : undefined;
        },
  });

  return {
    ...query,
    schools: query.data || [],
  };
}

// Helper function to invalidate school cache
export function useInvalidateSchools() {
  const queryClient = useQueryClient();

  return {
    invalidateSchools: (filters?: {
      search?: string;
      state?: string;
      sector?: string;
      status?: string;
      type?: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: schoolKeys.listSchools(filters) });
    },
    invalidateAllSchools: () => {
      queryClient.invalidateQueries({ queryKey: schoolKeys.all() });
    },
  };
}
