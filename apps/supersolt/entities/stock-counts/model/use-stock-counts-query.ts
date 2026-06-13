"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockCountsApi } from "@/entities/stock-counts/api/endpoints";
import { stockCountKeys } from "@/entities/stock-counts/model/keys";
import type { CreateStockCountInput } from "@/server/stock-counts/stock-counts.types";

export function useStockCountsQuery(args: {
  organisation: string;
  venue: string;
  status?: string;
}) {
  return useQuery({
    queryKey: stockCountKeys.list(args.organisation, args.venue, args.status),
    queryFn: async () => {
      const result = await stockCountsApi.get.list({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        status: args.status,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}

export function useStockCountDetailQuery(args: {
  organisation: string;
  venue: string;
  countId: string | null;
}) {
  return useQuery({
    queryKey: stockCountKeys.detail(
      args.organisation,
      args.venue,
      args.countId ?? "",
    ),
    enabled: Boolean(args.countId),
    queryFn: async () => {
      const result = await stockCountsApi.get.detail({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        countId: args.countId!,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}

export function useCreateStockCountMutation(args: {
  organisation: string;
  venue: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: CreateStockCountInput) => {
      const result = await stockCountsApi.post.create({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        body: body ?? { scopeType: "full" },
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: stockCountKeys.list(args.organisation, args.venue),
      });
    },
  });
}

export function useStockCountEntryMutation(args: {
  organisation: string;
  venue: string;
  countId: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      ingredientId: string;
      countedQty?: number;
      mixedUnitBreakdown?: Record<string, unknown>;
      notes?: string;
    }) => {
      const result = await stockCountsApi.patch.detail({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        countId: args.countId,
        body: {
          entries: [
            {
              ingredientId: entry.ingredientId,
              countedQty: entry.countedQty,
              mixedUnitBreakdown: entry.mixedUnitBreakdown,
              notes: entry.notes,
              isRowComplete: true,
            },
          ],
        },
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: stockCountKeys.detail(
          args.organisation,
          args.venue,
          args.countId,
        ),
      });
    },
  });
}

export function useStockCountActionMutation(args: {
  organisation: string;
  venue: string;
  countId: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      action: string;
      body?: Record<string, unknown>;
    }) => {
      const result = await stockCountsApi.post.action({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        countId: args.countId,
        action: input.action,
        body: input.body,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: stockCountKeys.all,
      });
    },
  });
}

export function useStockCountPhotoMutation(args: {
  organisation: string;
  venue: string;
  countId: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entryId: string; file: File }) => {
      const result = await stockCountsApi.post.entryPhoto({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        countId: args.countId,
        entryId: input.entryId,
        file: input.file,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: stockCountKeys.detail(
          args.organisation,
          args.venue,
          args.countId,
        ),
      });
    },
  });
}
