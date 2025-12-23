import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";
import { meKeys } from "@/entities/me/model/keys";

/**
 * Hook for completing a tutorial.
 *
 * Automatically invalidates the current user query cache when a tutorial is completed.
 * The MeLoader component will automatically refetch and update the Zustand store.
 */
export function useCompleteTutorial(): UseMutationResult<
  {
    tutorials: Record<string, { completed: boolean; completedAt?: string }>;
  } | null,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tutorialKey: string) => {
      const { data, error } = await meApi.tutorials.complete(tutorialKey);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? null;
    },
    onSuccess: () => {
      // Invalidate current user query - MeLoader will automatically refetch and update store
      queryClient.invalidateQueries({ queryKey: meKeys.current() });
    },
  });
}
