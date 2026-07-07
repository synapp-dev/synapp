import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/entities/projects/model/types";

export const projectsApi = {
  get: {
    list(): Promise<ApiResult<Project[]>> {
      return apiFetch<Project[]>("/projects");
    },
  },
  post: {
    create(input: CreateProjectInput): Promise<ApiResult<Project>> {
      return apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  },
  patch: {
    update(
      projectId: string,
      input: UpdateProjectInput
    ): Promise<ApiResult<Project>> {
      return apiFetch<Project>(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  },
  delete: {
    remove(projectId: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/projects/${projectId}`, {
        method: "DELETE",
      });
    },
  },
};
