import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type {
  ModuleLockStatus,
  ReadinessCompactDto,
  ReadinessModuleId,
  ReadinessModuleStateDto,
  ReadinessPatchBody,
  ReadinessPayloadDto,
  ReadinessSuggestionDto,
} from "@/entities/readiness/model/types";
import { canApplyReadinessGatesForVenue } from "@/server/readiness/can-apply-readiness-gates";
import {
  evaluateReadinessChecks,
  isCheckSatisfied,
  isCoreGreen,
} from "@/server/readiness/evaluate-readiness-checks";
import {
  READINESS_CHECK_BLOCKERS,
  READINESS_MODULES,
  READINESS_MODULE_BY_ID,
} from "@/server/readiness/modules";
import {
  ReadinessBlockedError,
  ReadinessServiceError,
} from "@/server/readiness/readiness.errors";
import { readinessRepo } from "@/server/readiness/readiness.repo";
import { readinessUserStateRepo } from "@/server/readiness/readiness-user-state.repo";

function resolveVenueContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new ReadinessServiceError(404, message),
    forbidden: (auth) => auth,
  });
}

function buildModuleState(
  moduleId: ReadinessModuleId,
  checks: ReturnType<typeof evaluateReadinessChecks>,
): ReadinessModuleStateDto {
  const definition = READINESS_MODULE_BY_ID[moduleId];
  const blockers = definition.requiredChecks
    .filter((checkId) => !isCheckSatisfied(checks, checkId))
    .map((checkId) => READINESS_CHECK_BLOCKERS[checkId]);

  const unlocked = blockers.length === 0;
  let status: ModuleLockStatus = unlocked ? "unlocked" : "locked";
  if (!unlocked && definition.hideNavWhenLocked) {
    status = "hidden";
  }

  return {
    id: moduleId,
    title: definition.title,
    status,
    blockers,
  };
}

function buildSuggestions(
  modulesDetailed: ReadinessModuleStateDto[],
  dismissedKeys: string[],
): ReadinessSuggestionDto[] {
  const suggestions: ReadinessSuggestionDto[] = [];

  for (const module of modulesDetailed) {
    if (module.status === "unlocked") {
      continue;
    }

    const nextBlocker = module.blockers[0];
    if (!nextBlocker) {
      continue;
    }

    const suggestionKey = `${module.id}:${nextBlocker.taskId}`;
    if (dismissedKeys.includes(suggestionKey)) {
      continue;
    }

    const definition = READINESS_MODULE_BY_ID[module.id];
    suggestions.push({
      id: suggestionKey,
      kind: "setup",
      moduleId: module.id,
      gridLabel: definition.suggestion.gridLabel,
      title: nextBlocker.title,
      description: nextBlocker.description,
      ctaLabel: nextBlocker.ctaLabel,
      pathSuffix: nextBlocker.pathSuffix,
      iconId: definition.suggestion.iconId,
      pageFollowUpQuestion: definition.suggestion.pageFollowUpQuestion,
    });
  }

  return suggestions;
}

function buildPendingUnlockCelebrations(
  modulesDetailed: ReadinessModuleStateDto[],
  seenUnlockModuleIds: string[],
): ReadinessPayloadDto["pendingUnlockCelebrations"] {
  return modulesDetailed
    .filter(
      (module) =>
        module.status === "unlocked" &&
        !seenUnlockModuleIds.includes(module.id),
    )
    .map((module) => {
      const definition = READINESS_MODULE_BY_ID[module.id];
      return {
        moduleId: module.id,
        title: definition.title,
        pathSuffix: definition.suggestion.pathSuffix,
        ctaLabel: `Open ${definition.title.toLowerCase()}`,
      };
    });
}

async function loadEvaluation(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string },
) {
  const scope = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const appliesGating = canApplyReadinessGatesForVenue(ctx.tenantRoles, {
    organisationId: scope.organisationId,
    venueId: scope.venueId,
  });

  if (!appliesGating) {
    const allUnlocked = Object.fromEntries(
      READINESS_MODULES.map((module) => [module.id, "unlocked" as const]),
    ) as Record<ReadinessModuleId, ModuleLockStatus>;

    return {
      scope,
      appliesGating: false,
      coreGreen: true,
      modules: allUnlocked,
      modulesDetailed: READINESS_MODULES.map((module) => ({
        id: module.id,
        title: module.title,
        status: "unlocked" as const,
        blockers: [],
      })),
      userState: {
        dismissedSuggestionKeys: [],
        seenUnlockModuleIds: READINESS_MODULES.map((module) => module.id),
      },
    };
  }

  const counts = await ctx.appDb.rls((tx) =>
    readinessRepo.getVenueCounts(tx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    }),
  );
  const checks = evaluateReadinessChecks(counts);
  const modulesDetailed = READINESS_MODULES.map((module) =>
    buildModuleState(module.id, checks),
  );
  const modules = Object.fromEntries(
    modulesDetailed.map((module) => [module.id, module.status]),
  ) as Record<ReadinessModuleId, ModuleLockStatus>;

  const userState = await ctx.appDb.rls((tx) =>
    readinessUserStateRepo.get(tx, {
      userId: ctx.userId,
      venueId: scope.venueId,
    }),
  );

  return {
    scope,
    appliesGating: true,
    coreGreen: isCoreGreen(checks),
    modules,
    modulesDetailed,
    userState,
  };
}

export async function getVenueReadinessCompact(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string },
): Promise<ReadinessCompactDto> {
  const evaluation = await loadEvaluation(ctx, args);
  return {
    appliesGating: evaluation.appliesGating,
    coreGreen: evaluation.coreGreen,
    modules: evaluation.modules,
  };
}

export async function getVenueReadiness(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string },
): Promise<ReadinessPayloadDto> {
  const evaluation = await loadEvaluation(ctx, args);
  const suggestions = evaluation.appliesGating
    ? buildSuggestions(
        evaluation.modulesDetailed,
        evaluation.userState.dismissedSuggestionKeys,
      )
    : [];

  const pendingUnlockCelebrations = evaluation.appliesGating
    ? (() => {
        const allUnlocked = evaluation.modulesDetailed.every(
          (module) => module.status === "unlocked",
        );
        const suppressRetroactive =
          allUnlocked &&
          evaluation.userState.seenUnlockModuleIds.length === 0;
        if (suppressRetroactive) {
          return [];
        }
        return buildPendingUnlockCelebrations(
          evaluation.modulesDetailed,
          evaluation.userState.seenUnlockModuleIds,
        );
      })()
    : [];

  return {
    appliesGating: evaluation.appliesGating,
    coreGreen: evaluation.coreGreen,
    modules: evaluation.modules,
    modulesDetailed: evaluation.modulesDetailed,
    suggestions,
    pendingUnlockCelebrations,
  };
}

export async function patchVenueReadinessUserState(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    body: ReadinessPatchBody;
  },
): Promise<{ ok: true }> {
  const scope = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  if (
    !canApplyReadinessGatesForVenue(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    })
  ) {
    throw new ReadinessServiceError(403, "Readiness actions require manager access");
  }

  await ctx.appDb.rls(async (tx) => {
    if (args.body.action === "dismiss_suggestion") {
      await readinessUserStateRepo.upsertDismissSuggestion(tx, {
        userId: ctx.userId,
        venueId: scope.venueId,
        suggestionKey: args.body.suggestionKey,
      });
      return;
    }

    if (!READINESS_MODULE_BY_ID[args.body.moduleId]) {
      throw new ReadinessServiceError(400, "Unknown readiness module");
    }

    await readinessUserStateRepo.upsertMarkUnlockSeen(tx, {
      userId: ctx.userId,
      venueId: scope.venueId,
      moduleId: args.body.moduleId,
    });
  });

  return { ok: true };
}

export async function assertVenueModuleReady(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    moduleId: ReadinessModuleId;
  },
): Promise<void> {
  const evaluation = await loadEvaluation(ctx, args);
  if (!evaluation.appliesGating) {
    return;
  }

  const module = evaluation.modulesDetailed.find(
    (candidate) => candidate.id === args.moduleId,
  );
  if (!module || module.status === "unlocked") {
    return;
  }

  throw new ReadinessBlockedError(args.moduleId, module.blockers);
}

export function mapReadinessRouteError(error: unknown): never {
  if (error instanceof ReadinessBlockedError) {
    throw error;
  }
  if (error instanceof ReadinessServiceError) {
    throw error;
  }
  if (error instanceof AuthError) {
    throw new ReadinessServiceError(error.status, error.message);
  }
  throw error;
}
