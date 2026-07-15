"use client";

import { useQuery } from "@tanstack/react-query";

import type { InventoryCogsRange } from "@/server/dashboard/dashboard-digest.service";

export type { InventoryCogsRange };

export const inventoryCogsRangeKeys = {
  all: () => ["inventory-cogs-range"] as const,
  range: (org: string, venue: string, fromDate: string, toDate: string) =>
    [...inventoryCogsRangeKeys.all(), org, venue, fromDate, toDate] as const,
};

export function useInventoryCogsRange(input: {
  organisationSlug: string;
  venueSlug: string;
  fromDate: string;
  toDate: string;
  enabled?: boolean;
}) {
  const enabled =
    (input.enabled ?? true) &&
    Boolean(
      input.organisationSlug && input.venueSlug && input.fromDate && input.toDate,
    );

  return useQuery({
    queryKey: inventoryCogsRangeKeys.range(
      input.organisationSlug,
      input.venueSlug,
      input.fromDate,
      input.toDate,
    ),
    queryFn: async (): Promise<InventoryCogsRange | null> => {
      const response = await fetch(
        `/api/organisations/${input.organisationSlug}/venues/${input.venueSlug}/dashboard/inventory-cogs?from=${input.fromDate}&to=${input.toDate}`,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        data: InventoryCogsRange | null;
      };
      return payload.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
