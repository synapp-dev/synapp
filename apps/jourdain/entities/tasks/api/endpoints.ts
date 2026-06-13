import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@/entities/tasks/model/types";

export const tasksApi = {
  get: {
    list(status?: "open" | "done"): Promise<ApiResult<Task[]>> {
      const qs = status ? `?status=${status}` : "";
      return apiFetch<Task[]>(`/tasks${qs}`);
    },
  },
  post: {
    create(input: CreateTaskInput): Promise<ApiResult<Task>> {
      return apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  },
  patch: {
    update(taskId: string, input: UpdateTaskInput): Promise<ApiResult<Task>> {
      return apiFetch<Task>(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  },
  delete: {
    remove(taskId: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/tasks/${taskId}`, {
        method: "DELETE",
      });
    },
  },
};
