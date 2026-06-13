"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { readinessApi } from "@/entities/readiness/api/endpoints";
import type { ReadinessPatchBody } from "@/entities/readiness/model/types";

export function venueReadinessQueryKey(
  organisationSlug: string,
  venueSlug: string,
  view: "full" | "compact" = "full",
) {
  return ["venue-readiness", organisationSlug, venueSlug, view] as const;
}

export function useVenueReadinessQuery(args: {
  organisationSlug: string | null | undefined;
  venueSlug: string | null | undefined;
  enabled?: boolean;
}) {
  const enabled = Boolean(
    args.enabled !== false && args.organisationSlug && args.venueSlug,
  );

  return useQuery({
    queryKey: venueReadinessQueryKey(
      args.organisationSlug ?? "",
      args.venueSlug ?? "",
      "full",
    ),
    enabled,
    queryFn: async () => {
      const res = await readinessApi.getVenueReadiness(
        args.organisationSlug!,
        args.venueSlug!,
      );
      if (res.error) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useVenueReadinessCompactQuery(args: {
  organisationSlug: string | null | undefined;
  venueSlug: string | null | undefined;
  enabled?: boolean;
}) {
  const enabled = Boolean(
    args.enabled !== false && args.organisationSlug && args.venueSlug,
  );

  return useQuery({
    queryKey: venueReadinessQueryKey(
      args.organisationSlug ?? "",
      args.venueSlug ?? "",
      "compact",
    ),
    enabled,
    queryFn: async () => {
      const res = await readinessApi.getVenueReadinessCompact(
        args.organisationSlug!,
        args.venueSlug!,
      );
      if (res.error) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function usePatchVenueReadinessMutation(args: {
  organisationSlug: string;
  venueSlug: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReadinessPatchBody) => {
      const res = await readinessApi.patchVenueReadiness(
        args.organisationSlug,
        args.venueSlug,
        body,
      );
      if (res.error) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: venueReadinessQueryKey(
          args.organisationSlug,
          args.venueSlug,
          "full",
        ),
      });
      await queryClient.invalidateQueries({
        queryKey: venueReadinessQueryKey(
          args.organisationSlug,
          args.venueSlug,
          "compact",
        ),
      });
    },
  });
}
