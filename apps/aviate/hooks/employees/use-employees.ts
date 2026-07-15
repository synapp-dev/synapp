"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  employeesApi,
  type EmployeeUpdate,
} from "@/entities/employees/api/endpoints";
import type { ApiResult } from "@/lib/api/fetcher.client";

function unwrap<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}

export const employeeKeys = {
  all: ["employees", "all"] as const,
};

/** Full roster of employees (any status) for the admin people view. */
export function useAdminEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: async () => unwrap(await employeesApi.list(true)),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: EmployeeUpdate }) =>
      unwrap(await employeesApi.update(args.id, args.patch)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
