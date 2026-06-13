import { sql } from "drizzle-orm";
import type { RequestAuthContext } from "@/server/auth/context";
import { canApplyAwrUplift } from "@/server/auth/capabilities";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import { resolveMinimumRateFromPack } from "@/server/workforce/award/award-calculation.service";
import { AwardServiceError } from "@/server/workforce/award/award-errors";
import { awardRepo } from "@/server/workforce/award/award.repo";
import { awardService } from "@/server/workforce/award/award.service";
import type { EmploymentTypeScope } from "@/server/workforce/award/award-types";
import { trackAwardRatesEvent } from "@/server/workforce/award/award-telemetry";

export type AwrPreviewRow = {
  userProfileId: string;
  awardCode: string;
  awardGrade: string;
  currentRateCents: number | null;
  newMinimumCents: number;
  action: "auto_uplift" | "skip" | "manual_review";
  checkedByDefault: boolean;
};

export const awrUpliftService = {
  async preview(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; effectiveDate: string; awrYear: number },
  ): Promise<{ rows: AwrPreviewRow[] }> {
    const organisationId = resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug);
    if (!organisationId || !canApplyAwrUplift(ctx.tenantRoles, organisationId)) {
      throw new AwardServiceError(403, "Forbidden", "forbidden");
    }

    const config = await ctx.appDb.rls((tx) => awardRepo.getOrgConfig(tx, organisationId));
    if (config?.is_eba_covered) {
      return { rows: [] };
    }

    const profiles = await ctx.appDb.rls((tx) => awardRepo.listPayrollProfilesForOrg(tx, organisationId));
    const rows: AwrPreviewRow[] = [];

    for (const profile of profiles) {
      if (!profile.award_code || !profile.award_grade) {
        rows.push({
          userProfileId: profile.user_profile_id,
          awardCode: profile.award_code ?? "",
          awardGrade: profile.award_grade ?? "",
          currentRateCents: profile.pay_rate_cents,
          newMinimumCents: 0,
          action: "manual_review",
          checkedByDefault: false,
        });
        continue;
      }

      const pack = await awardService.getRulePack(ctx, profile.award_code);
      const employmentType = (profile.employment_type ?? "casual") as EmploymentTypeScope;
      let newMinimum = 0;
      try {
        newMinimum = resolveMinimumRateFromPack(pack, {
          awardCode: profile.award_code,
          classificationGrade: profile.award_grade,
          employmentType,
          asOfDate: args.effectiveDate,
        });
      } catch {
        rows.push({
          userProfileId: profile.user_profile_id,
          awardCode: profile.award_code,
          awardGrade: profile.award_grade,
          currentRateCents: profile.pay_rate_cents,
          newMinimumCents: 0,
          action: "manual_review",
          checkedByDefault: false,
        });
        continue;
      }

      const current = profile.pay_rate_cents;
      let action: AwrPreviewRow["action"] = "auto_uplift";
      if (current != null && current >= newMinimum) {
        action = "skip";
      }

      rows.push({
        userProfileId: profile.user_profile_id,
        awardCode: profile.award_code,
        awardGrade: profile.award_grade,
        currentRateCents: current,
        newMinimumCents: newMinimum,
        action,
        checkedByDefault: action === "auto_uplift",
      });
    }

    trackAwardRatesEvent("award_rates.awr_preview", {
      organisation_id: organisationId,
      awr_year: args.awrYear,
      employee_count: rows.length,
      auto_uplift_count: rows.filter((r) => r.action === "auto_uplift").length,
      skip_count: rows.filter((r) => r.action === "skip").length,
      manual_review_count: rows.filter((r) => r.action === "manual_review").length,
    });

    return { rows };
  },

  async apply(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      effectiveDate: string;
      awrYear: number;
      sourcePrReference: string;
      rows: Array<{ userProfileId: string; newRateCents: number }>;
    },
  ) {
    const organisationId = resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug);
    if (!organisationId || !canApplyAwrUplift(ctx.tenantRoles, organisationId)) {
      throw new AwardServiceError(403, "Forbidden", "forbidden");
    }

    if (args.rows.length === 0) {
      throw new AwardServiceError(422, "Select at least one employee.", "validation_error");
    }

    let totalUplift = 0;
    await ctx.appDb.rls(async (tx) => {
      for (const row of args.rows) {
        const profiles = await awardRepo.listPayrollProfilesForOrg(tx, organisationId);
        const profile = profiles.find((p) => p.user_profile_id === row.userProfileId);
        const prior = profile?.pay_rate_cents ?? 0;
        totalUplift += Math.max(0, row.newRateCents - prior);

        await tx.execute(sql`
          UPDATE public.employee_payroll_profiles
          SET pay_rate_cents = ${row.newRateCents}, updated_at = now()
          WHERE organisation_id = ${organisationId} AND user_profile_id = ${row.userProfileId}
        `);

        await tx.execute(sql`
          INSERT INTO public.employee_pay_rate_history (
            organisation_id, user_profile_id, pay_rate_cents, effective_from,
            reason_category, source_reference, created_by_user_id
          ) VALUES (
            ${organisationId}, ${row.userProfileId}, ${row.newRateCents}, ${args.effectiveDate},
            'award_uplift', ${args.sourcePrReference}, ${ctx.userId}
          )
        `);
      }

      await tx.execute(sql`
        INSERT INTO public.awr_uplift_events (
          organisation_id, award_code, awr_year, effective_date, applied_by_user_id,
          affected_employee_count, skipped_employee_count, total_uplift_cents, source_pr_reference
        ) VALUES (
          ${organisationId}, 'MA000119', ${args.awrYear}, ${args.effectiveDate}, ${ctx.userId},
          ${args.rows.length}, 0, ${totalUplift}, ${args.sourcePrReference}
        )
      `);
    });

    trackAwardRatesEvent("award_rates.awr_applied", {
      organisation_id: organisationId,
      awr_year: args.awrYear,
      applied_count: args.rows.length,
      skipped_count: 0,
      source_pr_reference: args.sourcePrReference,
    });

    return { appliedCount: args.rows.length, totalUpliftCents: totalUplift };
  },
};
