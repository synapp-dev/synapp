"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { InsightsDatePreset, InsightsDateRange } from "@/entities/insights/model/types";
import {
  DEFAULT_INSIGHTS_PRESET,
  INSIGHTS_FROM_PARAM,
  INSIGHTS_PERIOD_PARAM,
  INSIGHTS_TO_PARAM,
  buildInsightsPeriodQueryString,
  formatInsightsDateRangeText,
  parseInsightsCustomDates,
  parseInsightsDatePreset,
  pickInsightsPeriodSearchParams,
  resolveInsightsDateRange,
  toDateInputValue,
} from "@/entities/insights/lib/period";

type InsightsPeriodContextValue = {
  preset: InsightsDatePreset;
  dateRange: InsightsDateRange;
  rangeLabel: string;
  customFrom?: Date;
  customTo?: Date;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  setPreset: (preset: InsightsDatePreset) => void;
  setCustomFrom: (date: Date | undefined) => void;
  setCustomTo: (date: Date | undefined) => void;
  applyCustomRange: () => void;
};

const InsightsPeriodContext = createContext<InsightsPeriodContextValue | null>(
  null,
);

function replacePeriodInUrl(
  pathname: string,
  router: ReturnType<typeof useRouter>,
  searchParams: URLSearchParams,
  next: {
    preset: InsightsDatePreset;
    customFrom?: Date;
    customTo?: Date;
  },
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set(INSIGHTS_PERIOD_PARAM, next.preset);
  if (next.preset === "custom") {
    if (next.customFrom) {
      params.set(INSIGHTS_FROM_PARAM, toDateInputValue(next.customFrom));
    } else {
      params.delete(INSIGHTS_FROM_PARAM);
    }
    if (next.customTo) {
      params.set(INSIGHTS_TO_PARAM, toDateInputValue(next.customTo));
    } else {
      params.delete(INSIGHTS_TO_PARAM);
    }
  } else {
    params.delete(INSIGHTS_FROM_PARAM);
    params.delete(INSIGHTS_TO_PARAM);
  }
  const query = params.toString();
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

export function InsightsPeriodProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);

  const preset = useMemo(
    () => parseInsightsDatePreset(searchParams.get(INSIGHTS_PERIOD_PARAM)),
    [searchParams],
  );

  const { customFrom: urlCustomFrom, customTo: urlCustomTo } = useMemo(
    () => parseInsightsCustomDates(searchParams),
    [searchParams],
  );

  const [draftCustomFrom, setDraftCustomFrom] = useState<Date | undefined>();
  const [draftCustomTo, setDraftCustomTo] = useState<Date | undefined>();

  const customFrom = draftCustomFrom ?? urlCustomFrom;
  const customTo = draftCustomTo ?? urlCustomTo;

  const dateRange = useMemo(
    () =>
      resolveInsightsDateRange({
        preset,
        customFrom: preset === "custom" ? customFrom : undefined,
        customTo: preset === "custom" ? customTo : undefined,
      }),
    [customFrom, customTo, preset],
  );

  const rangeLabel = useMemo(
    () => formatInsightsDateRangeText(dateRange),
    [dateRange],
  );

  const setPreset = useCallback(
    (nextPreset: InsightsDatePreset) => {
      if (nextPreset === "custom") {
        setPickerOpen(true);
      }
      replacePeriodInUrl(pathname, router, searchParams, {
        preset: nextPreset,
        customFrom: nextPreset === "custom" ? customFrom : undefined,
        customTo: nextPreset === "custom" ? customTo : undefined,
      });
    },
    [customFrom, customTo, pathname, router, searchParams],
  );

  const setCustomFrom = useCallback((date: Date | undefined) => {
    setDraftCustomFrom(date);
  }, []);

  const setCustomTo = useCallback((date: Date | undefined) => {
    setDraftCustomTo(date);
  }, []);

  const applyCustomRange = useCallback(() => {
    const from =
      draftCustomFrom ??
      urlCustomFrom ??
      resolveInsightsDateRange({ preset: DEFAULT_INSIGHTS_PRESET }).start;
    const to =
      draftCustomTo ??
      urlCustomTo ??
      resolveInsightsDateRange({ preset: DEFAULT_INSIGHTS_PRESET }).end;
    replacePeriodInUrl(pathname, router, searchParams, {
      preset: "custom",
      customFrom: from,
      customTo: to,
    });
    setDraftCustomFrom(undefined);
    setDraftCustomTo(undefined);
    setPickerOpen(false);
  }, [
    draftCustomFrom,
    draftCustomTo,
    pathname,
    router,
    searchParams,
    urlCustomFrom,
    urlCustomTo,
  ]);

  const value = useMemo(
    (): InsightsPeriodContextValue => ({
      preset,
      dateRange,
      rangeLabel,
      customFrom,
      customTo,
      pickerOpen,
      setPickerOpen,
      setPreset,
      setCustomFrom,
      setCustomTo,
      applyCustomRange,
    }),
    [
      applyCustomRange,
      customFrom,
      customTo,
      dateRange,
      pickerOpen,
      preset,
      rangeLabel,
      setCustomFrom,
      setCustomTo,
      setPreset,
    ],
  );

  return (
    <InsightsPeriodContext.Provider value={value}>
      {children}
    </InsightsPeriodContext.Provider>
  );
}

export function useInsightsPeriod(): InsightsPeriodContextValue {
  const context = useContext(InsightsPeriodContext);
  if (!context) {
    throw new Error("useInsightsPeriod must be used within InsightsPeriodProvider");
  }
  return context;
}

export function useInsightsPeriodSearchString(): string {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const query = pickInsightsPeriodSearchParams(searchParams);
    if (query) {
      return query;
    }
    return buildInsightsPeriodQueryString({ preset: DEFAULT_INSIGHTS_PRESET });
  }, [searchParams]);
}

