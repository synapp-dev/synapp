import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type Organisation = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export const organisationsApi = {
  list(): Promise<ApiResult<Organisation[]>> {
    return apiFetch<Organisation[]>("/organisations");
  },
};
