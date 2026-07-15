"use client";

import { useQuery } from "@tanstack/react-query";

import { organisationsApi } from "@/entities/organisations/api/endpoints";
import type { ApiResult } from "@/lib/api/fetcher.client";

function unwrap<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}

export const organisationKeys = {
  list: ["organisations"] as const,
};

export function useOrganisations() {
  return useQuery({
    queryKey: organisationKeys.list,
    queryFn: async () => unwrap(await organisationsApi.list()),
    staleTime: 5 * 60 * 1000,
  });
}
