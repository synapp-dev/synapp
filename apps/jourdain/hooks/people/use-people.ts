"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  peopleApi,
  type ImportPeopleResult,
} from "@/entities/people/api/endpoints";
import type {
  CreatePersonInput,
  Person,
  UpdatePersonInput,
} from "@/entities/people/model/types";

export const peopleQueryKey = ["people"] as const;

export function usePeople() {
  return useQuery({
    queryKey: peopleQueryKey,
    queryFn: async (): Promise<Person[]> => {
      const result = await peopleApi.get.list();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePersonInput): Promise<Person> => {
      const result = await peopleApi.post.create(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useImportPeople() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      people: CreatePersonInput[]
    ): Promise<ImportPeopleResult> => {
      const result = await peopleApi.post.import(people);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      personId: string;
      input: UpdatePersonInput;
    }): Promise<Person> => {
      const result = await peopleApi.patch.update(args.personId, args.input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personId: string): Promise<void> => {
      const result = await peopleApi.delete.remove(personId);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}
