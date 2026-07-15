"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestsApi, type RequestScope } from "@/entities/requests/api/endpoints";
import type {
  CreateRequestInput,
  DecisionInput,
} from "@/entities/requests/model/types";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { Tables } from "@/types/supabase";

function unwrap<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}

export const requestKeys = {
  list: (scope: RequestScope) => ["requests", "list", scope] as const,
  detail: (id: string) => ["requests", "detail", id] as const,
  me: ["requests", "me"] as const,
  employees: ["requests", "employees"] as const,
};

export function useRequests(scope: RequestScope) {
  return useQuery({
    queryKey: requestKeys.list(scope),
    queryFn: async () => unwrap(await requestsApi.list(scope)),
  });
}

export function useRequestDetail(id: string | null) {
  return useQuery({
    queryKey: requestKeys.detail(id ?? ""),
    queryFn: async () => unwrap(await requestsApi.get(id!)),
    enabled: !!id,
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: requestKeys.me,
    queryFn: async () => unwrap(await requestsApi.me()),
  });
}

/** Active org employees, for counterparty / "acting as" pickers. */
export function useOrgEmployees() {
  return useQuery({
    queryKey: requestKeys.employees,
    queryFn: async () => unwrap(await apiFetch<Tables<"employees">[]>("/employees")),
  });
}

function useInvalidateLists() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["requests", "list"] });
  };
}

export function useCreateRequest() {
  const invalidateLists = useInvalidateLists();
  return useMutation({
    mutationFn: async (input: CreateRequestInput) =>
      unwrap(await requestsApi.create(input)),
    onSuccess: invalidateLists,
  });
}

export function useDecideRequest(id: string) {
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateLists();
  return useMutation({
    mutationFn: async (input: DecisionInput) =>
      unwrap(await requestsApi.decide(id, input)),
    onSuccess: (detail) => {
      queryClient.setQueryData(requestKeys.detail(id), detail);
      invalidateLists();
    },
  });
}

export function useCancelRequest(id: string) {
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateLists();
  return useMutation({
    mutationFn: async () => unwrap(await requestsApi.cancel(id)),
    onSuccess: (detail) => {
      queryClient.setQueryData(requestKeys.detail(id), detail);
      invalidateLists();
    },
  });
}
