import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateRequestInput,
  DecisionInput,
  MeEmployee,
  RequestDetail,
  RequestListItem,
} from "@/entities/requests/model/types";

export type RequestScope = "mine" | "inbox" | "all";

export const requestsApi = {
  list(scope: RequestScope = "mine"): Promise<ApiResult<RequestListItem[]>> {
    return apiFetch<RequestListItem[]>(`/requests?scope=${scope}`);
  },
  get(id: string): Promise<ApiResult<RequestDetail>> {
    return apiFetch<RequestDetail>(`/requests/${id}`);
  },
  create(input: CreateRequestInput): Promise<ApiResult<RequestDetail>> {
    return apiFetch<RequestDetail>("/requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  decide(id: string, input: DecisionInput): Promise<ApiResult<RequestDetail>> {
    return apiFetch<RequestDetail>(`/requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  cancel(id: string): Promise<ApiResult<RequestDetail>> {
    return apiFetch<RequestDetail>(`/requests/${id}/cancel`, {
      method: "POST",
    });
  },
  me(): Promise<ApiResult<MeEmployee>> {
    return apiFetch<MeEmployee>("/me/employee");
  },
};
