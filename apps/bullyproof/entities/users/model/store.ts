import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { userKeys } from "./keys";

// React Query hooks for users with pagination and filters
export function useUsers(filters?: {
  search?: string;
  role?: string;
  schoolId?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "createdAt" | "lastActive";
  sortDir?: "asc" | "desc";
  enabled?: boolean;
}) {
  // Extract pagination params with defaults
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  const fetchAll = limit === -1;
  const enabled = filters?.enabled ?? true;
  const sortBy = filters?.sortBy;
  const sortDir = filters?.sortDir;

  // Normalize filters for query key
  const normalizedFilters = filters
    ? (() => {
        const filtered: { search?: string; role?: string; schoolId?: string } = {};
        if (filters.search) filtered.search = String(filters.search);
        if (filters.role) filtered.role = String(filters.role);
        if (filters.schoolId) filtered.schoolId = String(filters.schoolId);
        return Object.keys(filtered).length > 0 ? filtered : undefined;
      })()
    : undefined;

  const query = useQuery({
    queryKey: [
      ...userKeys.list(normalizedFilters),
      { limit, offset, fetchAll, sortBy, sortDir },
    ],
    queryFn: async () => {
      if (fetchAll) {
        const allUsers: UserWithRolesAndSchools[] = [];
        let currentOffset = 0;
        const batchSize = 100;
        let hasMore = true;
        let totalCount = 0;

        while (hasMore) {
          const result = await meApi.get.listAllUsers({
            limit: batchSize,
            offset: currentOffset,
            search: normalizedFilters?.search,
            role: normalizedFilters?.role,
            schoolId: normalizedFilters?.schoolId,
            sortBy,
            sortDir,
          });
          
          if (result.error) {
            throw new Error(result.error.message || "Failed to fetch users");
          }
          
          if (result.data) {
            if (currentOffset === 0) {
              totalCount = result.data.totalCount;
            }
            
            if (result.data.users.length > 0) {
              allUsers.push(...result.data.users);
              if (result.data.users.length < batchSize) {
                hasMore = false;
              } else {
                currentOffset += batchSize;
              }
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        return { users: allUsers, totalCount };
      } else {
        const result = await meApi.get.listAllUsers({
          limit,
          offset,
          search: normalizedFilters?.search,
          role: normalizedFilters?.role,
          schoolId: normalizedFilters?.schoolId,
          sortBy,
          sortDir,
        });
        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch users");
        }
        if (result.data) {
          return result.data;
        }
        return { users: [], totalCount: 0 };
      }
    },
    staleTime: normalizedFilters ? 0 : 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    enabled,
  });

  return {
    ...query,
    users: query.data?.users || [],
    totalCount: query.data?.totalCount || 0,
  };
}

// Hook to fetch all users (for filter options)
export function useAllUsers() {
  const query = useQuery<UserWithRolesAndSchools[]>({
    queryKey: [...userKeys.lists(), "all"],
    queryFn: async () => {
      const result = await meApi.get.listAllUsers({
        limit: 100,
        offset: 0,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch all users");
      }
      if (result.data) {
        return result.data.users;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    allUsers: query.data || [],
  };
}

// Hook to fetch roles
export function useRoles() {
  const query = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const result = await rolesApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch roles");
      }
      if (result.data) {
        return result.data;
      }
      return [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    ...query,
    roles: query.data || [],
  };
}

// Helper function to invalidate user cache
export function useInvalidateUsers() {
  const queryClient = useQueryClient();

  return {
    invalidateUsers: (filters?: {
      search?: string;
      role?: string;
      schoolId?: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.list(filters) });
    },
    invalidateAllUsers: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.lists(), "all"] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  };
}
