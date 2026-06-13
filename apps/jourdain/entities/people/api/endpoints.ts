import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreatePersonInput,
  Person,
  UpdatePersonInput,
} from "@/entities/people/model/types";

export type ImportPeopleResult = {
  importedCount: number;
  skippedCount: number;
  people: Person[];
};

export const peopleApi = {
  get: {
    list(): Promise<ApiResult<Person[]>> {
      return apiFetch<Person[]>("/people");
    },
  },
  post: {
    create(input: CreatePersonInput): Promise<ApiResult<Person>> {
      return apiFetch<Person>("/people", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    import(people: CreatePersonInput[]): Promise<ApiResult<ImportPeopleResult>> {
      return apiFetch<ImportPeopleResult>("/people/import", {
        method: "POST",
        body: JSON.stringify({ people }),
      });
    },
  },
  patch: {
    update(personId: string, input: UpdatePersonInput): Promise<ApiResult<Person>> {
      return apiFetch<Person>(`/people/${personId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  },
  delete: {
    remove(personId: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/people/${personId}`, {
        method: "DELETE",
      });
    },
  },
};
