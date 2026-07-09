import type { ContentTypeRow } from "@/types/db";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type CreateContentTypeInput = {
  name: string;
  levelCount: number;
  levelNames: string[];
  /** Deep-copy an existing type's whole tree as a starting template. */
  sourceContentTypeId?: string;
};

export type UpdateContentTypeInput = {
  name?: string;
  levelCount?: number;
  levelNames?: string[];
};

/**
 * Client-side Content Types admin API. All routes sit behind the
 * `/admin/content-types` feature gate (dark until commissioned).
 */
export const contentTypesApi = {
  list(): Promise<ApiResult<ContentTypeRow[]>> {
    return apiFetch<ContentTypeRow[]>("/admin/content-types");
  },
  create(data: CreateContentTypeInput): Promise<ApiResult<ContentTypeRow>> {
    return apiFetch<ContentTypeRow>("/admin/content-types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(
    id: string,
    data: UpdateContentTypeInput,
  ): Promise<ApiResult<ContentTypeRow>> {
    return apiFetch<ContentTypeRow>(
      `/admin/content-types/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  },
  delete(id: string): Promise<ApiResult<{ id: string }>> {
    return apiFetch<{ id: string }>(
      `/admin/content-types/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
