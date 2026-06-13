import type { RequestAuthContext } from "@/server/auth/context";
import {
  canApplyAwrUplift,
  canManageAwardConfig,
  canViewAwardRates,
} from "@/server/auth/capabilities";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import {
  computeShiftCostWithPack,
  resolveMinimumRateFromPack,
} from "@/server/workforce/award/award-calculation.service";
import { AwardServiceError } from "@/server/workforce/award/award-errors";
import { awardRepo } from "@/server/workforce/award/award.repo";
import { getBuiltinRulePack, listBuiltinAwardCodes } from "@/server/workforce/award/award-seed-packs";
import { trackAwardRatesEvent } from "@/server/workforce/award/award-telemetry";
import type {
  AwardRulePack,
  EmploymentTypeScope,
  MinimumRateInput,
  ShiftCostInput,
  ShiftCostResult,
} from "@/server/workforce/award/award-types";

export type AwardListItemDto = {
  awardCode: string;
  awardName: string;
  awardShortName: string;
  prReference: string;
  sourceUrl: string;
};

export type OrgAwardConfigDto = {
  defaultAwardCode: string | null;
  isEbaCovered: boolean;
  casualLoadingPctOverride: number | null;
};

export type AwardRateCardDto = {
  award: AwardListItemDto;
  lastUpdated: { appliedAt: string; sourceReference: string; updateType: string } | null;
  classifications: Array<{
    level: string;
    grade: string;
    description: string;
  }>;
  rates: Array<{
    level: string;
    grade: string;
    employmentType: EmploymentTypeScope;
    baseHourlyCents: number;
    casualLoadedHourlyCents: number;
  }>;
  penalties: Array<{
    dayType: string;
    employmentTypeScope: string;
    upliftType: string;
    upliftValue: number;
    timeStart: string;
    timeEnd: string;
  }>;
  minimumEngagements: Array<{
    employmentType: EmploymentTypeScope;
    dayType: string;
    minimumHours: number;
  }>;
};

function assertOrgAdmin(ctx: RequestAuthContext, organisationId: string) {
  if (!canViewAwardRates(ctx.tenantRoles, organisationId)) {
    throw new AwardServiceError(403, "Forbidden", "forbidden");
  }
}

async function resolveOrgId(ctx: RequestAuthContext, organisationSlug: string): Promise<string> {
  const organisationId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!organisationId) {
    throw new AwardServiceError(404, "Organisation not found", "internal_error");
  }
  return organisationId;
}

async function loadRulePack(ctx: RequestAuthContext, awardCode: string): Promise<AwardRulePack> {
  const fromDb = await ctx.appDb.rls((tx) => awardRepo.loadRulePack(tx, awardCode));
  if (fromDb && fromDb.rates.length > 0) {
    return fromDb;
  }
  const builtin = getBuiltinRulePack(awardCode);
  if (builtin) {
    return builtin;
  }
  throw new AwardServiceError(
    404,
    `Award ${awardCode} is not loaded in the library.`,
    "award_not_loaded",
  );
}

export const awardService = {
  async getRulePack(ctx: RequestAuthContext, awardCode: string): Promise<AwardRulePack> {
    return loadRulePack(ctx, awardCode);
  },

  async getMinimumRate(ctx: RequestAuthContext, input: MinimumRateInput): Promise<number> {
    const pack = await loadRulePack(ctx, input.awardCode);
    return resolveMinimumRateFromPack(pack, input);
  },

  async computeShiftCost(
    ctx: RequestAuthContext,
    input: ShiftCostInput & { awardCode: string },
  ): Promise<ShiftCostResult> {
    const pack = await loadRulePack(ctx, input.awardCode);
    return computeShiftCostWithPack(pack, input);
  },

  async listForOrg(ctx: RequestAuthContext, organisationSlug: string) {
    const organisationId = await resolveOrgId(ctx, organisationSlug);
    assertOrgAdmin(ctx, organisationId);

    const awards = await ctx.appDb.rls((tx) => awardRepo.listAwards(tx));
    const awardRows =
      awards.length > 0
        ? awards
        : listBuiltinAwardCodes().map((code) => {
            const p = getBuiltinRulePack(code)!;
            return {
              award_code: p.awardCode,
              award_name: p.awardName,
              award_short_name: p.awardShortName,
              current_version_pr_reference: p.prReference,
              source_url: p.sourceUrl,
              casual_loading_pct: String(p.casualLoadingPct),
            };
          });

    const configRow = await ctx.appDb.rls((tx) => awardRepo.getOrgConfig(tx, organisationId));

    trackAwardRatesEvent("award_rates.viewed", {
      organisation_id: organisationId,
      awards_in_scope: awardRows.map((a) => a.award_code),
    });

    return {
      awards: awardRows.map((a) => ({
        awardCode: a.award_code,
        awardName: a.award_name,
        awardShortName: a.award_short_name,
        prReference: a.current_version_pr_reference,
        sourceUrl: a.source_url,
      })),
      config: {
        defaultAwardCode: configRow?.default_award_code ?? "MA000119",
        isEbaCovered: configRow?.is_eba_covered ?? false,
        casualLoadingPctOverride: configRow?.casual_loading_pct_override
          ? Number(configRow.casual_loading_pct_override)
          : null,
      } satisfies OrgAwardConfigDto,
    };
  },

  async getRateCard(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; awardCode: string },
  ): Promise<AwardRateCardDto> {
    const organisationId = await resolveOrgId(ctx, args.organisationSlug);
    assertOrgAdmin(ctx, organisationId);

    const pack = await loadRulePack(ctx, args.awardCode);
    const classifications = await ctx.appDb.rls((tx) =>
      awardRepo.listClassifications(tx, args.awardCode),
    );
    const lastUpdated = await ctx.appDb.rls((tx) =>
      awardRepo.getLatestLibraryUpdate(tx, args.awardCode),
    );

    trackAwardRatesEvent("award_rates.rate_card_viewed", {
      organisation_id: organisationId,
      award_code: args.awardCode,
    });

    return {
      award: {
        awardCode: pack.awardCode,
        awardName: pack.awardName,
        awardShortName: pack.awardShortName,
        prReference: pack.prReference,
        sourceUrl: pack.sourceUrl,
      },
      lastUpdated: lastUpdated
        ? {
            appliedAt: lastUpdated.applied_at,
            sourceReference: lastUpdated.source_reference,
            updateType: lastUpdated.update_type,
          }
        : null,
      classifications:
        classifications.length > 0
          ? classifications.map((c) => ({
              level: c.classification_level,
              grade: c.classification_grade,
              description: c.description,
            }))
          : pack.rates
              .filter((r, i, arr) => arr.findIndex((x) => x.classificationGrade === r.classificationGrade) === i)
              .map((r) => ({
                level: r.classificationLevel,
                grade: r.classificationGrade,
                description: r.classificationLevel,
              })),
      rates: pack.rates.map((r) => ({
        level: r.classificationLevel,
        grade: r.classificationGrade,
        employmentType: r.employmentType,
        baseHourlyCents: r.baseHourlyCents,
        casualLoadedHourlyCents: r.casualLoadedHourlyCents,
      })),
      penalties: pack.penalties.map((p) => ({
        dayType: p.dayType,
        employmentTypeScope: p.employmentTypeScope,
        upliftType: p.upliftType,
        upliftValue: p.upliftValue,
        timeStart: p.timeStart,
        timeEnd: p.timeEnd,
      })),
      minimumEngagements: pack.minimumEngagements,
    };
  },

  async updateOrgConfig(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      defaultAwardCode: string | null;
      isEbaCovered: boolean;
      casualLoadingPctOverride: number | null;
    },
  ) {
    const organisationId = await resolveOrgId(ctx, args.organisationSlug);
    if (!canManageAwardConfig(ctx.tenantRoles, organisationId)) {
      throw new AwardServiceError(403, "Forbidden", "forbidden");
    }

    await ctx.appDb.rls((tx) =>
      awardRepo.upsertOrgConfig(tx, {
        organisationId,
        defaultAwardCode: args.defaultAwardCode,
        isEbaCovered: args.isEbaCovered,
        casualLoadingPctOverride: args.casualLoadingPctOverride,
      }),
    );

    trackAwardRatesEvent("award_rates.config_updated", {
      organisation_id: organisationId,
      fields_changed: ["defaultAwardCode", "isEbaCovered", "casualLoadingPctOverride"],
    });
  },
};

export function mapAwardAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new AwardServiceError(error.status, error.message, "forbidden");
  }
  throw error;
}

/** Sync minimum rate for unit tests and preflight when pack is known. */
export function getMinimumRateFromPack(pack: AwardRulePack, input: MinimumRateInput): number {
  return resolveMinimumRateFromPack(pack, input);
}

/** Sync shift cost using built-in seed pack (tests). */
export function computeShiftCostFromBuiltin(
  awardCode: string,
  input: ShiftCostInput,
): ShiftCostResult {
  const pack = getBuiltinRulePack(awardCode);
  if (!pack) {
    throw new AwardServiceError(404, `Award ${awardCode} not loaded`, "award_not_loaded");
  }
  return computeShiftCostWithPack(pack, input);
}
