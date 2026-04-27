import { assertFeature, checkFeatureAccess } from "@/server/features/features.service";
import { PAGE_FEATURES } from "@/lib/feature-keys";
import {
  cultureRatingInputMetricsSchema,
  compareToBenchmark,
  type CultureRatingInputMetrics,
  type CultureRatingImprovementVsBenchmark,
} from "./culture-rating-metrics";
import { inclusiveDateRangesOverlap } from "./culture-rating-periods";
import {
  cultureRatingsRepo,
  type BenchmarkRow,
  type ComparativeRow,
  type ReportRequestRow,
} from "./culture-ratings.repo";

type Auth = { userId: string | null };

async function assertAdminCulture(ctx: Auth): Promise<string> {
  await assertFeature(ctx, PAGE_FEATURES.ADMIN_CULTURE_RATINGS);
  if (!ctx.userId) throw new Error("Unauthorized");
  return ctx.userId;
}

async function assertSchoolCulture(
  ctx: Auth,
  schoolId: string
): Promise<string> {
  if (!ctx.userId) throw new Error("Unauthorized");
  const ok = await checkFeatureAccess(
    ctx.userId,
    PAGE_FEATURES.SCHOOL_CULTURE_RATING,
    schoolId
  );
  if (!ok) throw new Error("Unauthorized");
  return ctx.userId;
}

/**
 * Rule 2 (curriculum — "all lessons to all classes"): not enforced here yet.
 * Requires a product definition (e.g. every active class completed all topics in a stage)
 * before wiring a lessons/classes query into create/update comparative.
 */
async function validateComparativeOutsideBenchmark(params: {
  schoolId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<void> {
  const bench = await cultureRatingsRepo.getBenchmark(params.schoolId);
  if (!bench) return;
  if (
    inclusiveDateRangesOverlap(
      bench.periodStart,
      bench.periodEnd,
      params.periodStart,
      params.periodEnd
    )
  ) {
    throw new Error(
      "Comparative period must not overlap the benchmark period"
    );
  }
  if (params.periodStart <= bench.periodEnd) {
    throw new Error(
      "Comparative period must start after the benchmark period ends"
    );
  }
}

const MIN_COMPARATIVE_SCHOOL_DAYS = 20;

function assertComparativeSchoolDays(metrics: {
  schoolDaysInPeriod: number;
}): void {
  if (metrics.schoolDaysInPeriod < MIN_COMPARATIVE_SCHOOL_DAYS) {
    throw new Error(
      `Comparative period must include at least ${MIN_COMPARATIVE_SCHOOL_DAYS} school days (school days in period)`
    );
  }
}

export type SchoolCultureDetail = {
  benchmark: BenchmarkRow | null;
  comparatives: (ComparativeRow & {
    improvement: CultureRatingImprovementVsBenchmark | null;
    report: ReportRequestRow | null;
  })[];
};

async function buildSchoolDetail(schoolId: string): Promise<SchoolCultureDetail> {
  const benchmark = await cultureRatingsRepo.getBenchmark(schoolId);
  const comps = await cultureRatingsRepo.listComparatives(schoolId);
  const comparatives = comps.map((c) => ({
    ...c,
    improvement: benchmark
      ? compareToBenchmark(benchmark.metrics, c.metrics)
      : null,
  }));
  return { benchmark, comparatives };
}

export const cultureRatingsService = {
  async listSchoolsSummary(ctx: Auth) {
    await assertAdminCulture(ctx);
    return cultureRatingsRepo.listSchoolsWithCultureSummary();
  },

  async getSchoolDetail(ctx: Auth, schoolId: string): Promise<SchoolCultureDetail> {
    await assertAdminCulture(ctx);
    return buildSchoolDetail(schoolId);
  },

  async getSchoolDetailForSchoolUser(
    ctx: Auth,
    schoolId: string
  ): Promise<SchoolCultureDetail> {
    await assertSchoolCulture(ctx, schoolId);
    return buildSchoolDetail(schoolId);
  },

  async upsertBenchmark(
    ctx: Auth,
    schoolId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
      sourceNotes?: string | null;
    }
  ): Promise<BenchmarkRow> {
    const userId = await assertAdminCulture(ctx);
    const metrics = cultureRatingInputMetricsSchema.parse(body.metrics);
    if (body.periodEnd < body.periodStart) {
      throw new Error("periodEnd must be on or after periodStart");
    }
    return cultureRatingsRepo.upsertBenchmark({
      schoolId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      metrics,
      sourceNotes: body.sourceNotes?.trim() || null,
      userId,
    });
  },

  async createComparative(
    ctx: Auth,
    schoolId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
    },
    opts?: { asSchoolUser?: boolean }
  ): Promise<ComparativeRow> {
    const userId = opts?.asSchoolUser
      ? await assertSchoolCulture(ctx, schoolId)
      : await assertAdminCulture(ctx);
    const metrics = cultureRatingInputMetricsSchema.parse(body.metrics);
    assertComparativeSchoolDays(metrics);
    if (body.periodEnd < body.periodStart) {
      throw new Error("periodEnd must be on or after periodStart");
    }
    await validateComparativeOutsideBenchmark({
      schoolId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });
    return cultureRatingsRepo.insertComparative({
      schoolId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      metrics,
      userId,
    });
  },

  async updateComparative(
    ctx: Auth,
    schoolId: string,
    comparativeId: string,
    body: {
      periodStart: string;
      periodEnd: string;
      metrics: CultureRatingInputMetrics;
    },
    opts?: { asSchoolUser?: boolean }
  ): Promise<ComparativeRow> {
    const userId = opts?.asSchoolUser
      ? await assertSchoolCulture(ctx, schoolId)
      : await assertAdminCulture(ctx);
    const metrics = cultureRatingInputMetricsSchema.parse(body.metrics);
    assertComparativeSchoolDays(metrics);
    if (body.periodEnd < body.periodStart) {
      throw new Error("periodEnd must be on or after periodStart");
    }
    await validateComparativeOutsideBenchmark({
      schoolId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });
    const row = await cultureRatingsRepo.updateComparative({
      id: comparativeId,
      schoolId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      metrics,
      userId,
    });
    if (!row) throw new Error("Comparative period not found");
    return row;
  },

  async deleteComparative(
    ctx: Auth,
    schoolId: string,
    comparativeId: string
  ): Promise<void> {
    await assertAdminCulture(ctx);
    const ok = await cultureRatingsRepo.deleteComparative(
      comparativeId,
      schoolId
    );
    if (!ok) throw new Error("Comparative period not found");
  },

  async requestReport(
    ctx: Auth,
    schoolId: string,
    comparativeId: string,
    opts?: { asSchoolUser?: boolean }
  ): Promise<ReportRequestRow> {
    const userId = opts?.asSchoolUser
      ? await assertSchoolCulture(ctx, schoolId)
      : await assertAdminCulture(ctx);
    const comp = await cultureRatingsRepo.getComparativeById(
      comparativeId,
      schoolId
    );
    if (!comp) throw new Error("Comparative period not found");
    const rep = await cultureRatingsRepo.requestReport({
      comparativePeriodId: comparativeId,
      userId,
    });
    if (!rep) throw new Error("Failed to create report request");
    return rep;
  },

  async deliverReport(
    ctx: Auth,
    schoolId: string,
    comparativeId: string,
    file: File,
    displayName: string
  ): Promise<ReportRequestRow> {
    await assertAdminCulture(ctx);
    const comp = await cultureRatingsRepo.getComparativeById(
      comparativeId,
      schoolId
    );
    if (!comp) throw new Error("Comparative period not found");

    if (!(file instanceof File) || file.size <= 0) {
      throw new Error("File is required");
    }
    const mime = file.type || "application/pdf";
    const lowerName = file.name.toLowerCase();
    const looksPdf =
      mime.includes("pdf") ||
      lowerName.endsWith(".pdf") ||
      displayName.toLowerCase().endsWith(".pdf");
    if (!looksPdf) {
      throw new Error("Only PDF reports are supported");
    }

    const { createServerClient } = await import("@/utils/supabase/server");
    const supabase = await createServerClient();
    const safeName = displayName.replace(/[^a-zA-Z0-9._-]/g, "_") || "report.pdf";
    const storagePath = `culture-ratings/schools/${schoolId}/comparatives/${comparativeId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from("content")
      .upload(storagePath, buffer, { contentType: mime, upsert: true });
    if (error) {
      throw new Error(error.message || "Upload failed");
    }

    const rep = await cultureRatingsRepo.setReportDelivered({
      comparativePeriodId: comparativeId,
      storagePath,
      mimeType: mime,
      displayName: displayName || safeName,
      userId: ctx.userId!,
    });
    if (!rep) throw new Error("Failed to save report metadata");
    return rep;
  },

  async getReportSignedUrl(
    ctx: Auth,
    schoolId: string,
    comparativeId: string,
    opts?: { asSchoolUser?: boolean }
  ): Promise<{ url: string; fileName: string | null }> {
    if (opts?.asSchoolUser) {
      await assertSchoolCulture(ctx, schoolId);
    } else {
      await assertAdminCulture(ctx);
    }
    const comp = await cultureRatingsRepo.getComparativeById(
      comparativeId,
      schoolId
    );
    if (!comp) throw new Error("Comparative period not found");
    const rep = await cultureRatingsRepo.getReportByComparativeId(
      comparativeId
    );
    if (!rep?.deliveredStoragePath || rep.status !== "completed") {
      throw new Error("Report not available");
    }
    const { createServerClient } = await import("@/utils/supabase/server");
    const supabase = await createServerClient();
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(rep.deliveredStoragePath, 3600);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Could not create download URL");
    }
    return { url: data.signedUrl, fileName: rep.deliveredDisplayName };
  },
};
