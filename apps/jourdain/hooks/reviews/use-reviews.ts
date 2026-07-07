"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { Review, UpsertReviewInput } from "@/entities/reviews/model/types";

export const reviewsQueryKey = ["reviews"] as const;

/** The saved reflection for a week (Monday start), or null when none yet. */
export function useReview(weekStart: string) {
  return useQuery({
    queryKey: [...reviewsQueryKey, weekStart],
    queryFn: async (): Promise<Review | null> => {
      const result = await apiFetch<Review | null>(
        `/reviews?week_start=${weekStart}`
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useUpsertReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertReviewInput): Promise<Review> => {
      const result = await apiFetch<Review>("/reviews", {
        method: "PUT",
        body: JSON.stringify(input),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (review) => {
      queryClient.setQueryData([...reviewsQueryKey, review.weekStart], review);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save review");
    },
  });
}
