"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wasteApi } from "@/entities/waste/api/endpoints";
import { wasteKeys } from "@/entities/waste/model/keys";
import type { CreateWasteEntryInput } from "@/entities/waste/model/types";

export function useWasteEntriesQuery(args: {
  organisation: string;
  venue: string;
  fromIso: string;
  toIso?: string;
}) {
  return useQuery({
    queryKey: wasteKeys.list(args.organisation, args.venue, args.fromIso, args.toIso),
    queryFn: async () => {
      const result = await wasteApi.get.list({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        fromIso: args.fromIso,
        toIso: args.toIso,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}

export function useLogWasteMutation(args: { organisation: string; venue: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateWasteEntryInput) => {
      const result = await wasteApi.post.create({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        body,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}

export function useLogWasteBulkMutation(args: { organisation: string; venue: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: CreateWasteEntryInput[]) => {
      const result = await wasteApi.post.createBulk({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        entries,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}

export function useDeleteWasteEntryMutation(args: {
  organisation: string;
  venue: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const result = await wasteApi.delete.entry({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        entryId,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}
