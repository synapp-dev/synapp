import { useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolApi } from "../api/endpoints";
import { schoolKeys } from "./keys";

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
export function useSchools(filters?: {
  search?: string;
  state?: string;
  sector?: string;
  status?: string;
  type?: string;
}) {
  // Only use search filter for API call (server-side filtering)
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

          if (mappedSchools.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }

      return allSchools;
    },
    staleTime: hasSearchFilter ? 0 : 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
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
