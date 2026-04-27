"use client";

import { apiFetch } from "@/lib/api/fetcher.client";
import type {
  CultureComparativeRow,
  CultureReportRow,
  SchoolCultureDetailResponse,
  CultureRatingInputMetrics,
} from "./culture-ratings-admin-api";

export const cultureRatingsSchoolApi = {
  async getDetail(schoolId: string) {
    return apiFetch<SchoolCultureDetailResponse>(
      `/schools/${encodeURIComponent(schoolId)}/culture-rating`
    );
  },

  async postComparative(
    schoolId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
    }
  ) {
    return apiFetch<CultureComparativeRow>(
      `/schools/${encodeURIComponent(schoolId)}/culture-rating/comparatives`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  },

  async patchComparative(
    schoolId: string,
    comparativeId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
    }
  ) {
    return apiFetch<CultureComparativeRow>(
      `/schools/${encodeURIComponent(schoolId)}/culture-rating/comparatives/${encodeURIComponent(comparativeId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  },

  async requestReport(schoolId: string, comparativeId: string) {
    return apiFetch<CultureReportRow>(
      `/schools/${encodeURIComponent(schoolId)}/culture-rating/comparatives/${encodeURIComponent(comparativeId)}/request-report`,
      { method: "POST" }
    );
  },

  async getReportDownloadUrl(schoolId: string, comparativeId: string) {
    return apiFetch<{ url: string; fileName: string | null }>(
      `/schools/${encodeURIComponent(schoolId)}/culture-rating/comparatives/${encodeURIComponent(comparativeId)}/report-download`
    );
  },
};
