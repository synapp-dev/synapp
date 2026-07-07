"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { identityApi } from "@/entities/identity/api/endpoints";
import type {
  CreateIdentityEntryInput,
  IdentityEntry,
  IdentitySection,
  UpdateIdentityEntryInput,
} from "@/entities/identity/model/types";

export const identityQueryKey = ["identity-entries"] as const;

function sectionKey(section?: IdentitySection) {
  return section
    ? ([...identityQueryKey, section] as const)
    : ([...identityQueryKey, "all"] as const);
}

export function useIdentityEntries(section?: IdentitySection) {
  return useQuery({
    queryKey: sectionKey(section),
    queryFn: async (): Promise<IdentityEntry[]> => {
      const result = await identityApi.get.list(section);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCreateIdentityEntry(section: IdentitySection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<CreateIdentityEntryInput, "section">
    ): Promise<IdentityEntry> => {
      const result = await identityApi.post.create({ ...input, section });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't add entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: identityQueryKey });
    },
  });
}

export function useUpdateIdentityEntry(section: IdentitySection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      entryId: string;
      input: UpdateIdentityEntryInput;
    }): Promise<IdentityEntry> => {
      const result = await identityApi.patch.update(args.entryId, args.input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async ({ entryId, input }) => {
      const key = sectionKey(section);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IdentityEntry[]>(key);
      queryClient.setQueryData<IdentityEntry[]>(key, (old) =>
        (old ?? []).map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                title: input.title ?? entry.title,
                body: input.body !== undefined ? input.body : entry.body,
                extras: input.extras ?? entry.extras,
              }
            : entry
        )
      );
      return { previous };
    },
    onError: (err, _args, context) => {
      if (context?.previous)
        queryClient.setQueryData(sectionKey(section), context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't save entry");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: identityQueryKey });
    },
  });
}

export function useDeleteIdentityEntry(section: IdentitySection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string): Promise<void> => {
      const result = await identityApi.delete.remove(entryId);
      if (result.error) throw new Error(result.error.message);
    },
    onMutate: async (entryId) => {
      const key = sectionKey(section);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IdentityEntry[]>(key);
      queryClient.setQueryData<IdentityEntry[]>(key, (old) =>
        (old ?? []).filter((entry) => entry.id !== entryId)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(sectionKey(section), context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't delete entry");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: identityQueryKey });
    },
  });
}

export function useReorderIdentityEntries(section: IdentitySection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const result = await identityApi.put.reorder({ section, ids });
      if (result.error) throw new Error(result.error.message);
    },
    onMutate: async (ids) => {
      const key = sectionKey(section);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IdentityEntry[]>(key);
      queryClient.setQueryData<IdentityEntry[]>(key, (old) => {
        const byId = new Map((old ?? []).map((entry) => [entry.id, entry]));
        return ids
          .map((id, index) => {
            const entry = byId.get(id);
            return entry ? { ...entry, orderIndex: index } : null;
          })
          .filter((entry): entry is IdentityEntry => entry !== null);
      });
      return { previous };
    },
    onError: (err, _ids, context) => {
      if (context?.previous)
        queryClient.setQueryData(sectionKey(section), context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't reorder");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: identityQueryKey });
    },
  });
}
