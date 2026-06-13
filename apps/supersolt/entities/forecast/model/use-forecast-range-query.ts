"use client";

import { useQuery } from "@tanstack/react-query";
import { forecastApi } from "@/entities/forecast/api/endpoints";
import { forecastKeys } from "@/entities/forecast/model/keys";
import type {
  DailySalesRow,
  ForecastRow,
  VenueForecastStateDto,
} from "@/entities/forecast/model/types";

export type ForecastRangeInput = {
  organisationSlug: string;
  venueSlug: string;
  fromDate: string;
  toDate: string;
  enabled?: boolean;
};

export type ForecastRangeQueryResult = {
  forecasts: ForecastRow[];
  dailySales: DailySalesRow[];
  state: VenueForecastStateDto | null;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

function toCalendarDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateRangeToCalendarIso(range: { start: Date; end: Date }): {
  fromDate: string;
  toDate: string;
} {
  return {
    fromDate: toCalendarDateIso(range.start),
    toDate: toCalendarDateIso(range.end),
  };
}

export function useForecastRangeQuery(
  input: ForecastRangeInput
): ForecastRangeQueryResult {
  const enabled = input.enabled ?? true;
  const { fromDate, toDate } = {
    fromDate: input.fromDate,
    toDate: input.toDate,
  };

  const forecastsQuery = useQuery({
    queryKey: forecastKeys.forecasts(
      input.organisationSlug,
      input.venueSlug,
      fromDate,
      toDate
    ),
    queryFn: () =>
      forecastApi.get.forecasts({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        fromDate,
        toDate,
      }),
    enabled,
  });

  const dailySalesQuery = useQuery({
    queryKey: forecastKeys.dailySales(
      input.organisationSlug,
      input.venueSlug,
      fromDate,
      toDate
    ),
    queryFn: () =>
      forecastApi.get.dailySales({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        fromDate,
        toDate,
      }),
    enabled,
  });

  const state =
    forecastsQuery.data?.state ?? dailySalesQuery.data?.state ?? null;

  return {
    forecasts: forecastsQuery.data?.forecasts ?? [],
    dailySales: dailySalesQuery.data?.rows ?? [],
    state,
    isPending: forecastsQuery.isPending || dailySalesQuery.isPending,
    isError: forecastsQuery.isError || dailySalesQuery.isError,
    error:
      (forecastsQuery.error as Error | null) ??
      (dailySalesQuery.error as Error | null),
    refetch: () => {
      void forecastsQuery.refetch();
      void dailySalesQuery.refetch();
    },
  };
}
