import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: null; error?: string },
    Error,
    string // id
  >({
    mutationFn: async (id) => {
      const res = await fetch(`/api/organisations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete organisation");
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["organisations", id] });
      }
    },
  });
}
