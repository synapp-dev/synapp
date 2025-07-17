import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Organisation } from "@/providers/postgres/organisations/read";

export function useCreateOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: Organisation | null; error?: string },
    Error,
    Partial<Organisation>
  >({
    mutationFn: async (newOrg) => {
      const res = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrg),
      });
      if (!res.ok) throw new Error("Failed to create organisation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    },
  });
}
