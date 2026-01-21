import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import type { roles } from "@/server/db/schema";
import { userKeys } from "./keys";

type Role = typeof roles.$inferSelect;

interface UsersState {
  // Normalized cache: userId -> User
  users: Record<string, UserWithRolesAndSchools>;
  // List of user IDs (for maintaining order)
  userIds: string[];
  // All users for filter options (not filtered)
  allUsers: Record<string, UserWithRolesAndSchools>;
  allUserIds: string[];
  // Roles cache
  roles: Role[];

  // Actions
  setUsers: (users: UserWithRolesAndSchools[]) => void;
  setUser: (user: UserWithRolesAndSchools) => void;
  removeUser: (userId: string) => void;
  clearUsers: () => void;
  setAllUsers: (users: UserWithRolesAndSchools[]) => void;
  setRoles: (roles: Role[]) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: {},
  userIds: [],
  allUsers: {},
  allUserIds: [],
  roles: [],

  setUsers: (users) =>
    set({
      users: users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, UserWithRolesAndSchools>
      ),
      userIds: users.map((u) => u.id),
    }),

  setUser: (user) =>
    set((state) => {
      const newUsers = { ...state.users, [user.id]: user };
      const newUserIds = state.userIds.includes(user.id)
        ? state.userIds
        : [...state.userIds, user.id];
      return { users: newUsers, userIds: newUserIds };
    }),

  removeUser: (userId) =>
    set((state) => {
      const { [userId]: removed, ...users } = state.users;
      return {
        users,
        userIds: state.userIds.filter((id) => id !== userId),
      };
    }),

  clearUsers: () => set({ users: {}, userIds: [] }),

  setAllUsers: (users) =>
    set({
      allUsers: users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, UserWithRolesAndSchools>
      ),
      allUserIds: users.map((u) => u.id),
    }),

  setRoles: (roles) => set({ roles }),
}));

// React Query hooks for users with pagination and filters
export function useUsers(filters?: {
  search?: string;
  role?: string;
  schoolId?: string;
  limit?: number;
  offset?: number;
}) {
  const queryClient = useQueryClient();
  const { users, userIds, setUsers } = useUsersStore();
  
  // Extract pagination params with defaults
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  const fetchAll = limit === -1;
  
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
    queryKey: [...userKeys.list(normalizedFilters), { limit, offset, fetchAll }],
    queryFn: async () => {
      // If fetching all, make multiple requests in batches of 100
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
          });
          
          if (result.error) {
            throw new Error(result.error.message || "Failed to fetch users");
          }
          
          if (result.data) {
            // Get totalCount from first request
            if (currentOffset === 0) {
              totalCount = result.data.totalCount;
            }
            
            if (result.data.users.length > 0) {
              allUsers.push(...result.data.users);
              // If we got less than batchSize, we've reached the end
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
        
        // Update Zustand store with normalized data
        setUsers(allUsers);
        return { users: allUsers, totalCount };
      } else {
        // Normal paginated request
        const result = await meApi.get.listAllUsers({
          limit,
          offset,
          search: normalizedFilters?.search,
          role: normalizedFilters?.role,
          schoolId: normalizedFilters?.schoolId,
        });
        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch users");
        }
        if (result.data) {
          // Update Zustand store with normalized data
          setUsers(result.data.users);
          return result.data;
        }
        return { users: [], totalCount: 0 };
      }
    },
    staleTime: normalizedFilters ? 0 : 2 * 60 * 1000, // No cache when filtering, cache for 2 minutes otherwise
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
  });

  return {
    ...query,
    users: query.data?.users || [],
    totalCount: query.data?.totalCount || 0,
  };
}

// Hook to fetch all users (for filter options)
export function useAllUsers() {
  const queryClient = useQueryClient();
  const { allUsers, allUserIds, setAllUsers } = useUsersStore();

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
        setAllUsers(result.data.users);
        return result.data.users;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => {
      const zustandUsers = allUserIds.map((id) => allUsers[id]).filter(Boolean);
      return zustandUsers.length > 0 ? zustandUsers : undefined;
    },
  });

  return {
    ...query,
    allUsers: query.data || [],
  };
}

// Hook to fetch roles
export function useRoles() {
  const { roles, setRoles } = useUsersStore();

  const query = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const result = await rolesApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch roles");
      }
      if (result.data) {
        setRoles(result.data);
        return result.data;
      }
      return [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => {
      return roles.length > 0 ? roles : undefined;
    },
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
