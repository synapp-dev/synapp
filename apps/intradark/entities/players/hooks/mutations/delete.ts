import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeletePlayerMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; error?: string },
    Error,
    string // steamId64
  >({
    mutationFn: async (steamId64) => {
      // This would typically be a DELETE request to remove a player record
      // For now, we'll just return success
      return {
        success: true,
      };
    },
    onSuccess: () => {
      // Invalidate all player queries to refresh the cache
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}
