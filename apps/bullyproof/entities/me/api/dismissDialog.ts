import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";
import { meKeys } from "@/entities/me/model/keys";

export type DialogProgress = {
  [key: string]: {
    dismissed: boolean;
    dismissedAt?: string;
  };
};

/**
 * Hook for dismissing a dialog.
 *
 * Automatically invalidates the current user query cache when a dialog is dismissed.
 * The MeLoader component will automatically refetch and update the Zustand store.
 */
export function useDismissDialog(): UseMutationResult<
  {
    dialogs: DialogProgress;
  } | null,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dialogKey: string) => {
      const { data, error } = await meApi.dialogs.dismiss(dialogKey);
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
