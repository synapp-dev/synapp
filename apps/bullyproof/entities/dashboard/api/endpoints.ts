import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type MetricValue = {
  amount: number;
  type: "number" | "percentage";
};

export type MetricResponse = {
  value: MetricValue;
  previousValue: MetricValue;
};

export const metricsApi = {
  get: {
    /**
     * Get school count metric
     * @param params - Optional parameters including scope
     * @returns Metric response with current and previous month values
     */
    schools(params?: {
      scope?: "all" | "school";
    }): Promise<ApiResult<MetricResponse>> {
      const searchParams = new URLSearchParams();
      searchParams.set("metric", "count");
      if (params?.scope) {
        searchParams.set("scope", params.scope);
      }

      const query = searchParams.toString();
      return apiFetch<MetricResponse>(`/schools?${query}`);
    },

    /**
     * Get teacher count metric
     * @param params - Optional parameters including scope
     * @returns Metric response with current and previous month values
     */
    teachers(params?: {
      scope?: "all" | "school";
    }): Promise<ApiResult<MetricResponse>> {
      const searchParams = new URLSearchParams();
      if (params?.scope) {
        searchParams.set("scope", params.scope);
      }

      const query = searchParams.toString();
      return apiFetch<MetricResponse>(`/teachers${query ? `?${query}` : ""}`);
    },

    lessons: {
      /**
       * Get completed lessons count metric
       * @param params - Optional parameters including scope
       * @returns Metric response with current and previous month values
       */
      completed(params?: {
        scope?: "all" | "school";
      }): Promise<ApiResult<MetricResponse>> {
        const searchParams = new URLSearchParams();
        if (params?.scope) {
          searchParams.set("scope", params.scope);
        }

        const query = searchParams.toString();
        return apiFetch<MetricResponse>(
          `/lessons/completed${query ? `?${query}` : ""}`
        );
      },

      /**
       * Get engagement rate metric
       * @param params - Optional parameters including scope
       * @returns Metric response with current and previous month percentages
       */
      engagementRate(params?: {
        scope?: "all" | "school";
      }): Promise<ApiResult<MetricResponse>> {
        const searchParams = new URLSearchParams();
        if (params?.scope) {
          searchParams.set("scope", params.scope);
        }

        const query = searchParams.toString();
        return apiFetch<MetricResponse>(
          `/lessons/engagement-rate${query ? `?${query}` : ""}`
        );
      },
    },
  },
};

