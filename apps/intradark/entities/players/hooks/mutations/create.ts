import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlayerData } from "@/entities/players/lib/types";

export function useCreatePlayerMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: PlayerData | null; error?: string },
    Error,
    Partial<PlayerData>
  >({
    mutationFn: async (playerData) => {
      // This would typically be a POST to create a new player record
      // For now, we'll just return the data as if it was created
      return {
        success: true,
        data: playerData as PlayerData,
      };
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Invalidate and refetch player queries
        queryClient.invalidateQueries({ queryKey: ["players"] });
        queryClient.invalidateQueries({
          queryKey: ["players", "vanity", data.data.vanityUrl],
        });
        queryClient.invalidateQueries({
          queryKey: ["players", "steam", data.data.steamId64],
        });
      }
    },
  });
}
