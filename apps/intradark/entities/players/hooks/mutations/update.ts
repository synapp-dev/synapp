import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlayerData } from "@/entities/players/lib/types";

export function useUpdatePlayerMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: PlayerData | null; error?: string },
    Error,
    { steamId64: string; data: Partial<PlayerData> }
  >({
    mutationFn: async ({ steamId64, data }) => {
      // This would typically be a PUT/PATCH to update an existing player record
      // For now, we'll just return the updated data
      return {
        success: true,
        data: { steamId64, ...data } as PlayerData,
      };
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Invalidate and refetch player queries
        queryClient.invalidateQueries({ queryKey: ["players"] });
        queryClient.invalidateQueries({
          queryKey: ["players", "steam", response.data.steamId64],
        });
        if (response.data.vanityUrl) {
          queryClient.invalidateQueries({
            queryKey: ["players", "vanity", response.data.vanityUrl],
          });
        }
      }
    },
  });
}
