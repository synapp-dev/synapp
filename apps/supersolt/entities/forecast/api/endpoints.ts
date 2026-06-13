import type {
  DailySalesApiPayload,
  ForecastRecomputeApiPayload,
  ForecastsApiPayload,
  ForecastSyncApiPayload,
  VenueForecastStateDto,
} from "@/entities/forecast/model/types";

type RangeInput = {
  organisationSlug: string;
  venueSlug: string;
  fromDate: string;
  toDate: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as {
    data: T | null;
    error: { message: string; status: number } | null;
  };

  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }

  return json.data;
}

async function parseJsonNullable<T>(res: Response): Promise<T> {
  const json = (await res.json()) as {
    data: T | null;
    error: { message: string; status: number } | null;
  };

  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }

  return json.data as T;
}

export const forecastApi = {
  get: {
    async dailySales(input: RangeInput): Promise<DailySalesApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/daily-sales`;
      const qs = new URLSearchParams({
        from: input.fromDate,
        to: input.toDate,
      });
      const res = await fetch(`${path}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      return parseJson<DailySalesApiPayload>(res);
    },

    async forecasts(input: RangeInput): Promise<ForecastsApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/forecasts`;
      const qs = new URLSearchParams({
        from: input.fromDate,
        to: input.toDate,
      });
      const res = await fetch(`${path}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      return parseJson<ForecastsApiPayload>(res);
    },
  },

  post: {
    async syncBackfill(input: {
      organisationSlug: string;
      venueSlug: string;
      daysBack?: number;
    }): Promise<ForecastSyncApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/forecast/sync`;
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: input.daysBack }),
      });
      return parseJson<ForecastSyncApiPayload>(res);
    },

    async recompute(input: {
      organisationSlug: string;
      venueSlug: string;
    }): Promise<ForecastRecomputeApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/forecast/recompute`;
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
      });
      return parseJson<ForecastRecomputeApiPayload>(res);
    },
  },

  admin: {
    async state(input: { organisationSlug: string; venueSlug: string }) {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/forecast/state`;
      const res = await fetch(path, { method: "GET", credentials: "include" });
      return parseJsonNullable<VenueForecastStateDto | null>(res);
    },
  },
};
