import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import {
  schools,
  schoolCultureBenchmarks,
  schoolCultureComparativePeriods,
  schoolCultureReportRequests,
} from "@/drizzle/schema";
import type { CultureRatingInputMetrics } from "./culture-rating-metrics";

export type CultureReportStatus =
  | "draft"
  | "requested"
  | "in_review"
  | "completed"
  | "rejected";

export type BenchmarkRow = {
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

export type ComparativeRow = {
  id: string;
  schoolId: string;
  periodStart: string;
  periodEnd: string;
  metrics: CultureRatingInputMetrics;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ReportRequestRow = {
  id: string;
  comparativePeriodId: string;
  status: CultureReportStatus;
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

function asMetrics(raw: unknown): CultureRatingInputMetrics {
  return raw as CultureRatingInputMetrics;
}

export const cultureRatingsRepo = {
  async listSchoolsWithCultureSummary(): Promise<
    {
      schoolId: string;
      schoolName: string;
      slug: string | null;
      benchmarkPeriodStart: string | null;
      benchmarkPeriodEnd: string | null;
      comparativeCount: number;
      lastReportStatus: CultureReportStatus | null;
    }[]
  > {
    const benchmarkSub = db
      .select({
        schoolId: schoolCultureBenchmarks.schoolId,
        periodStart: schoolCultureBenchmarks.periodStart,
        periodEnd: schoolCultureBenchmarks.periodEnd,
      })
      .from(schoolCultureBenchmarks)
      .as("culture_bench");

    const comparativeAgg = db
      .select({
        schoolId: schoolCultureComparativePeriods.schoolId,
        comparativeCount: sql<number>`count(*)::int`.as("comparative_count"),
      })
      .from(schoolCultureComparativePeriods)
      .groupBy(schoolCultureComparativePeriods.schoolId)
      .as("culture_comp_agg");

    const rows = await db
      .select({
        schoolId: schools.id,
        schoolName: schools.name,
        slug: schools.slug,
        benchmarkPeriodStart: benchmarkSub.periodStart,
        benchmarkPeriodEnd: benchmarkSub.periodEnd,
        comparativeCount: comparativeAgg.comparativeCount,
      })
      .from(schools)
      .leftJoin(benchmarkSub, eq(benchmarkSub.schoolId, schools.id))
      .leftJoin(comparativeAgg, eq(comparativeAgg.schoolId, schools.id))
      .orderBy(schools.name);

    const compWithReport = await db
      .select({
        schoolId: schoolCultureComparativePeriods.schoolId,
        periodEnd: schoolCultureComparativePeriods.periodEnd,
        createdAt: schoolCultureComparativePeriods.createdAt,
        reportStatus: schoolCultureReportRequests.status,
      })
      .from(schoolCultureComparativePeriods)
      .leftJoin(
        schoolCultureReportRequests,
        eq(
          schoolCultureReportRequests.comparativePeriodId,
          schoolCultureComparativePeriods.id
        )
      );

    const bySchool = new Map<
      string,
      { periodEnd: string; createdAt: string; reportStatus: string | null }[]
    >();
    for (const row of compWithReport) {
      const list = bySchool.get(row.schoolId) ?? [];
      list.push(row);
      bySchool.set(row.schoolId, list);
    }
    const lastBySchool = new Map<string, CultureReportStatus>();
    for (const [sid, list] of bySchool) {
      list.sort((a, b) => {
        const pe = b.periodEnd.localeCompare(a.periodEnd);
        if (pe !== 0) return pe;
        return b.createdAt.localeCompare(a.createdAt);
      });
      const top = list[0];
      if (top?.reportStatus) {
        lastBySchool.set(sid, top.reportStatus as CultureReportStatus);
      }
    }

    return rows.map((r) => ({
      schoolId: r.schoolId,
      schoolName: r.schoolName,
      slug: r.slug,
      benchmarkPeriodStart: r.benchmarkPeriodStart,
      benchmarkPeriodEnd: r.benchmarkPeriodEnd,
      comparativeCount: Number(r.comparativeCount ?? 0),
      lastReportStatus: lastBySchool.get(r.schoolId) ?? null,
    }));
  },

  async getBenchmark(schoolId: string): Promise<BenchmarkRow | null> {
    const [row] = await db
      .select()
      .from(schoolCultureBenchmarks)
      .where(eq(schoolCultureBenchmarks.schoolId, schoolId))
      .limit(1);
    if (!row) return null;
    return {
      schoolId: row.schoolId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      metrics: asMetrics(row.metrics),
      sourceNotes: row.sourceNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  },

  async upsertBenchmark(params: {
    schoolId: string;
    periodStart: string;
    periodEnd: string;
    metrics: CultureRatingInputMetrics;
    sourceNotes: string | null;
    userId: string;
  }): Promise<BenchmarkRow> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(schoolCultureBenchmarks)
      .values({
        schoolId: params.schoolId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        metrics: params.metrics,
        sourceNotes: params.sourceNotes,
        createdAt: now,
        updatedAt: now,
        createdBy: params.userId,
        updatedBy: params.userId,
      })
      .onConflictDoUpdate({
        target: schoolCultureBenchmarks.schoolId,
        set: {
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          metrics: params.metrics,
          sourceNotes: params.sourceNotes,
          updatedAt: now,
          updatedBy: params.userId,
        },
      })
      .returning();
    return {
      schoolId: row.schoolId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      metrics: asMetrics(row.metrics),
      sourceNotes: row.sourceNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  },

  async listComparatives(schoolId: string): Promise<
    (ComparativeRow & { report: ReportRequestRow | null })[]
  > {
    const comps = await db
      .select()
      .from(schoolCultureComparativePeriods)
      .where(eq(schoolCultureComparativePeriods.schoolId, schoolId))
      .orderBy(
        desc(schoolCultureComparativePeriods.periodEnd),
        desc(schoolCultureComparativePeriods.createdAt)
      );

    const out: (ComparativeRow & { report: ReportRequestRow | null })[] = [];
    for (const c of comps) {
      const [rep] = await db
        .select()
        .from(schoolCultureReportRequests)
        .where(eq(schoolCultureReportRequests.comparativePeriodId, c.id))
        .limit(1);
      out.push({
        id: c.id,
        schoolId: c.schoolId,
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        metrics: asMetrics(c.metrics),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        createdBy: c.createdBy,
        updatedBy: c.updatedBy,
        report: rep
          ? {
              id: rep.id,
              comparativePeriodId: rep.comparativePeriodId,
              status: rep.status as CultureReportStatus,
              requestedAt: rep.requestedAt,
              requestedBy: rep.requestedBy,
              completedAt: rep.completedAt,
              deliveredStoragePath: rep.deliveredStoragePath,
              deliveredMimeType: rep.deliveredMimeType,
              deliveredDisplayName: rep.deliveredDisplayName,
              deliveredBy: rep.deliveredBy,
              createdAt: rep.createdAt,
              updatedAt: rep.updatedAt,
            }
          : null,
      });
    }
    return out;
  },

  async insertComparative(params: {
    schoolId: string;
    periodStart: string;
    periodEnd: string;
    metrics: CultureRatingInputMetrics;
    userId: string;
  }): Promise<ComparativeRow> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(schoolCultureComparativePeriods)
      .values({
        schoolId: params.schoolId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        metrics: params.metrics,
        createdAt: now,
        updatedAt: now,
        createdBy: params.userId,
        updatedBy: params.userId,
      })
      .returning();
    return {
      id: row.id,
      schoolId: row.schoolId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      metrics: asMetrics(row.metrics),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  },

  async updateComparative(params: {
    id: string;
    schoolId: string;
    periodStart: string;
    periodEnd: string;
    metrics: CultureRatingInputMetrics;
    userId: string;
  }): Promise<ComparativeRow | null> {
    const now = new Date().toISOString();
    const [row] = await db
      .update(schoolCultureComparativePeriods)
      .set({
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        metrics: params.metrics,
        updatedAt: now,
        updatedBy: params.userId,
      })
      .where(
        and(
          eq(schoolCultureComparativePeriods.id, params.id),
          eq(schoolCultureComparativePeriods.schoolId, params.schoolId)
        )
      )
      .returning();
    if (!row) return null;
    return {
      id: row.id,
      schoolId: row.schoolId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      metrics: asMetrics(row.metrics),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  },

  async getComparativeById(
    id: string,
    schoolId: string
  ): Promise<ComparativeRow | null> {
    const [row] = await db
      .select()
      .from(schoolCultureComparativePeriods)
      .where(
        and(
          eq(schoolCultureComparativePeriods.id, id),
          eq(schoolCultureComparativePeriods.schoolId, schoolId)
        )
      )
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      schoolId: row.schoolId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      metrics: asMetrics(row.metrics),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  },

  async deleteComparative(id: string, schoolId: string): Promise<boolean> {
    const res = await db
      .delete(schoolCultureComparativePeriods)
      .where(
        and(
          eq(schoolCultureComparativePeriods.id, id),
          eq(schoolCultureComparativePeriods.schoolId, schoolId)
        )
      )
      .returning({ id: schoolCultureComparativePeriods.id });
    return res.length > 0;
  },

  async requestReport(params: {
    comparativePeriodId: string;
    userId: string;
  }): Promise<ReportRequestRow | null> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(schoolCultureReportRequests)
      .values({
        comparativePeriodId: params.comparativePeriodId,
        status: "requested",
        requestedAt: now,
        requestedBy: params.userId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schoolCultureReportRequests.comparativePeriodId,
        set: {
          status: "requested",
          requestedAt: now,
          requestedBy: params.userId,
          updatedAt: now,
        },
      })
      .returning();
    return row
      ? {
          id: row.id,
          comparativePeriodId: row.comparativePeriodId,
          status: row.status as CultureReportStatus,
          requestedAt: row.requestedAt,
          requestedBy: row.requestedBy,
          completedAt: row.completedAt,
          deliveredStoragePath: row.deliveredStoragePath,
          deliveredMimeType: row.deliveredMimeType,
          deliveredDisplayName: row.deliveredDisplayName,
          deliveredBy: row.deliveredBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : null;
  },

  async setReportDelivered(params: {
    comparativePeriodId: string;
    storagePath: string;
    mimeType: string;
    displayName: string;
    userId: string;
  }): Promise<ReportRequestRow | null> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(schoolCultureReportRequests)
      .values({
        comparativePeriodId: params.comparativePeriodId,
        status: "completed",
        completedAt: now,
        deliveredStoragePath: params.storagePath,
        deliveredMimeType: params.mimeType,
        deliveredDisplayName: params.displayName,
        deliveredBy: params.userId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schoolCultureReportRequests.comparativePeriodId,
        set: {
          status: "completed",
          completedAt: now,
          deliveredStoragePath: params.storagePath,
          deliveredMimeType: params.mimeType,
          deliveredDisplayName: params.displayName,
          deliveredBy: params.userId,
          updatedAt: now,
        },
      })
      .returning();
    return row
      ? {
          id: row.id,
          comparativePeriodId: row.comparativePeriodId,
          status: row.status as CultureReportStatus,
          requestedAt: row.requestedAt,
          requestedBy: row.requestedBy,
          completedAt: row.completedAt,
          deliveredStoragePath: row.deliveredStoragePath,
          deliveredMimeType: row.deliveredMimeType,
          deliveredDisplayName: row.deliveredDisplayName,
          deliveredBy: row.deliveredBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : null;
  },

  async getReportByComparativeId(
    comparativePeriodId: string
  ): Promise<ReportRequestRow | null> {
    const [row] = await db
      .select()
      .from(schoolCultureReportRequests)
      .where(
        eq(schoolCultureReportRequests.comparativePeriodId, comparativePeriodId)
      )
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      comparativePeriodId: row.comparativePeriodId,
      status: row.status as CultureReportStatus,
      requestedAt: row.requestedAt,
      requestedBy: row.requestedBy,
      completedAt: row.completedAt,
      deliveredStoragePath: row.deliveredStoragePath,
      deliveredMimeType: row.deliveredMimeType,
      deliveredDisplayName: row.deliveredDisplayName,
      deliveredBy: row.deliveredBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
};
