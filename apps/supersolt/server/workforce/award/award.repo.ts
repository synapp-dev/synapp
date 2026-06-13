import { sql } from "drizzle-orm";
import type { RlsTx } from "@/server/db/drizzle";
import type { AwardRulePack, EmploymentTypeScope } from "@/server/workforce/award/award-types";

type AwardRow = {
  award_code: string;
  award_name: string;
  award_short_name: string;
  current_version_pr_reference: string;
  source_url: string;
  casual_loading_pct: string;
};

export const awardRepo = {
  async listAwards(tx: RlsTx): Promise<AwardRow[]> {
    const result = await tx.execute(sql`
      SELECT award_code, award_name, award_short_name, current_version_pr_reference, source_url, casual_loading_pct
      FROM public.awards
      ORDER BY award_code
    `);
    return result as unknown as AwardRow[];
  },

  async getAward(tx: RlsTx, awardCode: string): Promise<AwardRow | null> {
    const result = await tx.execute(sql`
      SELECT award_code, award_name, award_short_name, current_version_pr_reference, source_url, casual_loading_pct
      FROM public.awards
      WHERE award_code = ${awardCode}
      LIMIT 1
    `);
    const rows = result as unknown as AwardRow[];
    return rows[0] ?? null;
  },

  async loadRulePack(tx: RlsTx, awardCode: string): Promise<AwardRulePack | null> {
    const award = await awardRepo.getAward(tx, awardCode);
    if (!award) return null;

    const ratesResult = await tx.execute(sql`
      SELECT classification_level, classification_grade, employment_type::text AS employment_type,
             base_hourly_cents, casual_loaded_hourly_cents, effective_from::text, effective_until::text
      FROM public.award_rates
      WHERE award_code = ${awardCode}
    `);
    const penaltiesResult = await tx.execute(sql`
      SELECT classification_level, employment_type_scope::text AS employment_type_scope,
             day_type::text AS day_type, time_start::text AS time_start, time_end::text AS time_end,
             uplift_type::text AS uplift_type, uplift_value, effective_from::text, effective_until::text
      FROM public.penalty_rates
      WHERE award_code = ${awardCode}
    `);
    const minEngResult = await tx.execute(sql`
      SELECT employment_type::text AS employment_type, day_type, minimum_hours
      FROM public.minimum_engagements
      WHERE award_code = ${awardCode}
    `);

    type RateDb = {
      classification_level: string;
      classification_grade: string;
      employment_type: EmploymentTypeScope;
      base_hourly_cents: number;
      casual_loaded_hourly_cents: number;
      effective_from: string;
      effective_until: string | null;
    };

    const rates = (ratesResult as unknown as RateDb[]).map((r) => ({
      classificationLevel: r.classification_level,
      classificationGrade: r.classification_grade,
      employmentType: r.employment_type,
      baseHourlyCents: Number(r.base_hourly_cents),
      casualLoadedHourlyCents: Number(r.casual_loaded_hourly_cents),
      effectiveFrom: r.effective_from,
      effectiveUntil: r.effective_until,
    }));

    type PenaltyDb = {
      classification_level: string | null;
      employment_type_scope: "ft_pt" | "casual" | "all";
      day_type: "mon_fri" | "saturday" | "sunday" | "public_holiday";
      time_start: string;
      time_end: string;
      uplift_type: "percentage" | "dollar_per_hour";
      uplift_value: string;
      effective_from: string;
      effective_until: string | null;
    };

    const penalties = (penaltiesResult as unknown as PenaltyDb[]).map((p) => ({
      classificationLevel: p.classification_level,
      employmentTypeScope: p.employment_type_scope,
      dayType: p.day_type,
      timeStart: p.time_start.slice(0, 5),
      timeEnd: p.time_end.slice(0, 5),
      upliftType: p.uplift_type,
      upliftValue: Number(p.uplift_value),
      effectiveFrom: p.effective_from,
      effectiveUntil: p.effective_until,
    }));

    type MinDb = {
      employment_type: EmploymentTypeScope;
      day_type: string;
      minimum_hours: string;
    };

    const minimumEngagements = (minEngResult as unknown as MinDb[]).map((m) => ({
      employmentType: m.employment_type,
      dayType: m.day_type,
      minimumHours: Number(m.minimum_hours),
    }));

    return {
      awardCode: award.award_code,
      awardName: award.award_name,
      awardShortName: award.award_short_name,
      prReference: award.current_version_pr_reference,
      sourceUrl: award.source_url,
      casualLoadingPct: Number(award.casual_loading_pct),
      rates,
      penalties,
      minimumEngagements,
    };
  },

  async getOrgConfig(tx: RlsTx, organisationId: string) {
    const result = await tx.execute(sql`
      SELECT organisation_id, default_award_code, is_eba_covered, casual_loading_pct_override,
             annualised_salary_buffer_pct, above_award_high_income_threshold_cents
      FROM public.organisation_award_config
      WHERE organisation_id = ${organisationId}
      LIMIT 1
    `);
    type Row = {
      organisation_id: string;
      default_award_code: string | null;
      is_eba_covered: boolean;
      casual_loading_pct_override: string | null;
      annualised_salary_buffer_pct: string;
      above_award_high_income_threshold_cents: string | null;
    };
    return (result as unknown as Row[])[0] ?? null;
  },

  async upsertOrgConfig(
    tx: RlsTx,
    args: {
      organisationId: string;
      defaultAwardCode: string | null;
      isEbaCovered: boolean;
      casualLoadingPctOverride: number | null;
    },
  ) {
    await tx.execute(sql`
      INSERT INTO public.organisation_award_config (
        organisation_id, default_award_code, is_eba_covered, casual_loading_pct_override, updated_at
      ) VALUES (
        ${args.organisationId}, ${args.defaultAwardCode}, ${args.isEbaCovered},
        ${args.casualLoadingPctOverride}, now()
      )
      ON CONFLICT (organisation_id) DO UPDATE SET
        default_award_code = EXCLUDED.default_award_code,
        is_eba_covered = EXCLUDED.is_eba_covered,
        casual_loading_pct_override = EXCLUDED.casual_loading_pct_override,
        updated_at = now()
    `);
  },

  async listClassifications(tx: RlsTx, awardCode: string) {
    const result = await tx.execute(sql`
      SELECT classification_level, classification_grade, description, display_order
      FROM public.award_classifications
      WHERE award_code = ${awardCode}
      ORDER BY display_order
    `);
    return result as unknown as Array<{
      classification_level: string;
      classification_grade: string;
      description: string;
      display_order: number;
    }>;
  },

  async getLatestLibraryUpdate(tx: RlsTx, awardCode: string) {
    const result = await tx.execute(sql`
      SELECT applied_at, source_reference, update_type::text AS update_type
      FROM public.library_update_log
      WHERE award_code = ${awardCode}
      ORDER BY applied_at DESC
      LIMIT 1
    `);
    return (result as unknown as Array<{ applied_at: string; source_reference: string; update_type: string }>)[0] ?? null;
  },

  async listPayrollProfilesForOrg(tx: RlsTx, organisationId: string) {
    const result = await tx.execute(sql`
      SELECT user_profile_id, pay_rate_cents, award_code, award_classification, award_grade, employment_type::text
      FROM public.employee_payroll_profiles
      WHERE organisation_id = ${organisationId}
        AND award_code IS NOT NULL
    `);
    return result as unknown as Array<{
      user_profile_id: string;
      pay_rate_cents: number | null;
      award_code: string;
      award_classification: string | null;
      award_grade: string | null;
      employment_type: EmploymentTypeScope | null;
    }>;
  },
};
