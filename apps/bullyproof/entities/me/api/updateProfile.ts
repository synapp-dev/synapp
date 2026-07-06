import type { UserProfileExpandedRow } from "@/types/db";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { meApi } from "./endpoints";
import { meKeys } from "../model/keys";
import { useMeStore } from "../model/store";

type UserProfile = UserProfileExpandedRow;

type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export function useUpdateProfile(): UseMutationResult<
  UserProfile | null,
  Error,
  UpdateProfilePayload
> {
  const queryClient = useQueryClient();
  const setCurrentUser = useMeStore((s) => s.setCurrentUser);

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data, error } = await meApi.put.updateProfile(payload);
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    onSuccess: (data) => {
      if (data) {
        setCurrentUser(data);
        // Invalidate and refetch current user query
        queryClient.invalidateQueries({ queryKey: meKeys.current() });
      }
    },
  });
}
