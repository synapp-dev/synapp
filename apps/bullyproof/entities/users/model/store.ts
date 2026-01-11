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

// React Query hooks for users
export function useUsers(filters?: {
  search?: string;
  role?: string;
  schoolId?: string;
}) {
  const queryClient = useQueryClient();
  const { users, userIds, setUsers } = useUsersStore();

  // Normalize filters: remove undefined and empty string values to ensure consistent query keys
  const normalizedFilters = filters
    ? (() => {
        const filtered = Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== "")
        );
        return Object.keys(filtered).length > 0 ? filtered : undefined;
      })()
    : undefined;
  
  const hasFilters = !!normalizedFilters;
  
  const query = useQuery({
    queryKey: userKeys.list(normalizedFilters),
    queryFn: async () => {
      const result = await meApi.get.listAllUsers({
        limit: 100,
        offset: 0,
        search: normalizedFilters?.search,
        role: normalizedFilters?.role,
        schoolId: normalizedFilters?.schoolId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch users");
      }
      if (result.data) {
        // Update Zustand store with normalized data
        setUsers(result.data);
        return result.data;
      }
      return [];
    },
    staleTime: hasFilters ? 0 : 2 * 60 * 1000, // Always refetch filtered queries, cache unfiltered for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    // Only use initialData if there are no filters (to avoid stale filtered data)
    initialData: hasFilters
      ? undefined
      : () => {
          const zustandUsers = userIds.map((id) => users[id]).filter(Boolean);
          return zustandUsers.length > 0 ? zustandUsers : undefined;
        },
  });

  return {
    ...query,
    users: query.data || [],
  };
}

// Hook to fetch all users (for filter options)
export function useAllUsers() {
  const queryClient = useQueryClient();
  const { allUsers, allUserIds, setAllUsers } = useUsersStore();

  const query = useQuery({
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
        setAllUsers(result.data);
        return result.data;
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
