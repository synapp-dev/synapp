import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { Tables, TablesUpdate } from "@/types/supabase";

export type Employee = Tables<"employees">;
export type EmployeeUpdate = TablesUpdate<"employees">;

export const employeesApi = {
  list(includeAll = true): Promise<ApiResult<Employee[]>> {
    return apiFetch<Employee[]>(`/employees${includeAll ? "?all=true" : ""}`);
  },
  update(id: string, patch: EmployeeUpdate): Promise<ApiResult<Employee>> {
    return apiFetch<Employee>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};
