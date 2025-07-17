import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Organisation } from "@/providers/postgres/organisations/read";

export function useUpdateOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: Organisation | null; error?: string },
    Error,
    { id: string; updates: Partial<Organisation> }
  >({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`/api/organisations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update organisation");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["organisations", variables.id],
        });
      }
    },
  });
}
