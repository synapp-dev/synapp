"use client";

import { apiFetch, getAuthHeaders } from "@/lib/api/fetcher.client";

export type CultureRatingsSchoolSummary = {
  schoolId: string;
  schoolName: string;
  slug: string | null;
  benchmarkPeriodStart: string | null;
  benchmarkPeriodEnd: string | null;
  comparativeCount: number;
  lastReportStatus: string | null;
};

export type CultureRatingInputMetrics = {
  schoolDaysInPeriod: number;
  attendanceFteStudentDays: number;
  absencesFteStudentDays: number;
  minorBehaviourIncidents: number;
  majorBehaviourIncidents: number;
  shortSuspensionsCount: number;
  longSuspensionsCount: number;
  exclusionsCount: number;
};

export type CultureImprovement = {
  attendanceRateChangePercent: number | null;
  behaviourIncidentsRateChangePercent: number | null;
  suspensionsRateChangePercent: number | null;
  exclusionsRateChangePercent: number | null;
  cultureRatingPercent: number | null;
};

export type CultureReportRow = {
  id: string;
  comparativePeriodId: string;
  status: string;
  requestedAt: string | null;
  requestedBy: string | null;
  completedAt: string | null;
  deliveredStoragePath: string | null;
  deliveredMimeType: string | null;
  deliveredDisplayName: string | null;
  deliveredBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CultureBenchmarkRow = {
  schoolId: string;
  periodStart: string;
  periodEnd: string;
  metrics: CultureRatingInputMetrics;
  sourceNotes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type CultureComparativeRow = {
  id: string;
  schoolId: string;
  periodStart: string;
  periodEnd: string;
  metrics: CultureRatingInputMetrics;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  improvement: CultureImprovement | null;
  report: CultureReportRow | null;
};

export type SchoolCultureDetailResponse = {
  benchmark: CultureBenchmarkRow | null;
  comparatives: CultureComparativeRow[];
};

export const cultureRatingsAdminApi = {
  async getSummary() {
    return apiFetch<CultureRatingsSchoolSummary[]>(
      "/admin/culture-ratings/summary"
    );
  },

  async getSchoolDetail(schoolId: string) {
    return apiFetch<SchoolCultureDetailResponse>(
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}`
    );
  },

  async putBenchmark(
    schoolId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
      sourceNotes?: string | null;
    }
  ) {
    return apiFetch<CultureBenchmarkRow>(
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/benchmark`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
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
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives`,
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
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives/${encodeURIComponent(comparativeId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  },

  async deleteComparative(schoolId: string, comparativeId: string) {
    return apiFetch<{ ok: boolean }>(
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives/${encodeURIComponent(comparativeId)}`,
      { method: "DELETE" }
    );
  },

  async requestReport(schoolId: string, comparativeId: string) {
    return apiFetch<CultureReportRow>(
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives/${encodeURIComponent(comparativeId)}/request-report`,
      { method: "POST" }
    );
  },

  async getReportDownloadUrl(schoolId: string, comparativeId: string) {
    return apiFetch<{ url: string; fileName: string | null }>(
      `/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives/${encodeURIComponent(comparativeId)}/report-download`
    );
  },

  async uploadReport(
    schoolId: string,
    comparativeId: string,
    file: File,
    displayName: string
  ): Promise<{ ok: true; data: CultureReportRow } | { ok: false; message: string; status: number }> {
    const headers = await getAuthHeaders();
    const fd = new FormData();
    fd.set("file", file);
    fd.set("displayName", displayName);
    const res = await fetch(
      `/api/admin/culture-ratings/schools/${encodeURIComponent(schoolId)}/comparatives/${encodeURIComponent(comparativeId)}/report`,
      { method: "POST", headers, body: fd }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: typeof body?.error === "string" ? body.error : "Upload failed",
        status: res.status,
      };
    }
    return { ok: true, data: body as CultureReportRow };
  },
};
