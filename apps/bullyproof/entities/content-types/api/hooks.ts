"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contentTypesApi } from "./endpoints";
import { contentTypeKeys } from "../model/keys";

/** List all content types (Default first). Reference data, cached 5m. */
export function useContentTypes(enabled = true) {
  const query = useQuery({
    queryKey: contentTypeKeys.list(),
    queryFn: async () => {
      const result = await contentTypesApi.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to load content types");
      }
      return result.data ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { ...query, contentTypes: query.data ?? [] };
}

/** Invalidate the content-type list and any per-type stage caches. */
export function useInvalidateContentTypes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: contentTypeKeys.all });
    queryClient.invalidateQueries({ queryKey: ["stages"] });
  };
}
