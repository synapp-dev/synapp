import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateIdentityEntryInput,
  IdentityEntry,
  IdentitySection,
  ReorderIdentityEntriesInput,
  UpdateIdentityEntryInput,
} from "@/entities/identity/model/types";

export const identityApi = {
  get: {
    list(section?: IdentitySection): Promise<ApiResult<IdentityEntry[]>> {
      const query = section ? `?section=${section}` : "";
      return apiFetch<IdentityEntry[]>(`/identity/entries${query}`);
    },
  },
  post: {
    create(input: CreateIdentityEntryInput): Promise<ApiResult<IdentityEntry>> {
      return apiFetch<IdentityEntry>("/identity/entries", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  },
  put: {
    reorder(
      input: ReorderIdentityEntriesInput
    ): Promise<ApiResult<{ reordered: boolean }>> {
      return apiFetch<{ reordered: boolean }>("/identity/entries", {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
  },
  patch: {
    update(
      entryId: string,
      input: UpdateIdentityEntryInput
    ): Promise<ApiResult<IdentityEntry>> {
      return apiFetch<IdentityEntry>(`/identity/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  },
  delete: {
    remove(entryId: string): Promise<ApiResult<{ deleted: boolean }>> {
      return apiFetch<{ deleted: boolean }>(`/identity/entries/${entryId}`, {
        method: "DELETE",
      });
    },
  },
};
