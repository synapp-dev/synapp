import { QueryClient } from "@tanstack/react-query";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";

/**
 * Utility function to clear all user data from stores and invalidate all queries
 * This should be called when a user logs out to prevent data leakage
 */
export function clearAllUserData(queryClient: QueryClient) {
  // Clear all TanStack Query cache
  queryClient.clear();
  
  // Clear all stores
  useMeStore.getState().setCurrentUser(null);
  useMeStore.getState().clearUsers();
  useMeStore.getState().setLoading(false);
  
  useSchoolStore.getState().clearCurrentSchool();
  useSchoolStore.getState().clearLastAccessedSchool();
}

/**
 * Hook to get a function that clears all user data
 * This can be used in components that need to clear data on logout
 */
export function useClearUserData() {
  return (queryClient: QueryClient) => {
    clearAllUserData(queryClient);
  };
}
