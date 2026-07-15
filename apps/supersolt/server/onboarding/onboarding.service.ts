import type {
  OnboardingOrganisationDto,
  OnboardingStateResult,
  OnboardingVenueDto,
  OrganisationSetupProgress,
} from "@/entities/onboarding/model/types";
import type { RequestAuthContext } from "@/server/auth/context";
import {
  PLATFORM_CREW_ROLE_ID,
  PLATFORM_MANAGER_ROLE_ID,
  PLATFORM_OWNER_ROLE_ID,
} from "@/server/onboarding/constants";
import { onboardingRepo } from "@/server/onboarding/onboarding.repo";
import {
  ensureUniqueOrganisationSlug,
  ensureUniqueVenueSlug,
} from "@/server/onboarding/unique-slugs";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import { isTestModeConfigured } from "@/server/test-mode/test-mode";
import { seedDefaultLeaveTypes } from "@/server/workforce/leave-seed";
import { earlyOnboardingUnlockedSuffixes } from "@/server/onboarding/module-gates";

export type { OnboardingOrganisationDto, OnboardingStateResult, OnboardingVenueDto };

function parseSetupProgress(raw: unknown): OrganisationSetupProgress {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as OrganisationSetupProgress;
}

function isSquareRequiredForFinalize(): boolean {
  return process.env.ONBOARDING_REQUIRE_SQUARE !== "false";
}

async function venueHasSquareConnection(
  ctx: RequestAuthContext,
  venueId: string,
): Promise<boolean> {
  const conn = await squareConnectionsRepo.loadConnectionForVenue(
    ctx.appDb,
    venueId,
    true,
  );
  return conn !== null;
}

function normalizeAbn(input: string | undefined): string | null {
  if (!input?.trim()) {
    return null;
  }
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 11) {
    return null;
  }
  return digits;
}

export async function getOnboardingState(
  ctx: RequestAuthContext,
): Promise<OnboardingStateResult> {
  const setupCompletedAt = await ctx.appDb.rls((tx) =>
    onboardingRepo.getProfileSetupCompletedAt(tx, ctx.userId),
  );

  if (setupCompletedAt) {
    return { completed: true };
  }

  const memberships = await ctx.appDb.rls((tx) =>
    onboardingRepo.listOwnerMemberships(tx, ctx.userId),
  );

  if (memberships.length === 0) {
    return {
      completed: false,
      organisation: null,
      venues: [],
      userOrganisationId: null,
      squareConnected: false,
      unlockedRouteSuffixes: [],
      organisationSlug: null,
      primaryVenueSlug: null,
      testModeAvailable: isTestModeConfigured(),
    };
  }

  const orgIds = [...new Set(memberships.map((m) => m.organisationId))];
  const orgRows = await ctx.appDb.rls((tx) =>
    onboardingRepo.listOrganisationsByIds(tx, orgIds),
  );

  const org = orgRows[0];
  if (!org) {
    return {
      completed: false,
      organisation: null,
      venues: [],
      userOrganisationId: null,
      squareConnected: false,
      unlockedRouteSuffixes: [],
      organisationSlug: null,
      primaryVenueSlug: null,
      testModeAvailable: isTestModeConfigured(),
    };
  }

  const userOrganisationId =
    memberships.find((m) => m.organisationId === org.id)?.id ?? null;

  const venueRows = await ctx.appDb.rls((tx) =>
    onboardingRepo.listVenuesForOrganisation(tx, org.id),
  );

  const venues: OnboardingVenueDto[] = venueRows.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    timezone: v.timezone,
    dataStartsFrom: v.dataStartsFrom ?? null,
  }));

  const primaryVenue = venues[0] ?? null;
  const squareConnected = primaryVenue
    ? await venueHasSquareConnection(ctx, primaryVenue.id)
    : false;
  const unlockedRouteSuffixes = earlyOnboardingUnlockedSuffixes(squareConnected);

  return {
    completed: false,
    organisation: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      abn: org.abn,
      isGstRegistered: org.isGstRegistered,
      setupProgress: parseSetupProgress(org.setupProgress),
    },
    venues,
    userOrganisationId,
    squareConnected,
    unlockedRouteSuffixes,
    organisationSlug: org.slug,
    primaryVenueSlug: primaryVenue?.slug ?? null,
    testModeAvailable: isTestModeConfigured(),
  };
}

export async function upsertOnboardingOrganisation(
  ctx: RequestAuthContext,
  input: {
    name: string;
    abn?: string | null;
    isGstRegistered?: boolean;
    organisationId?: string | null;
    isTestRun?: boolean;
  },
): Promise<OnboardingOrganisationDto> {
  const state = await getOnboardingState(ctx);
  if (state.completed) {
    throw new Error("Setup already completed");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Organisation name is required");
  }

  const abn = normalizeAbn(input.abn ?? undefined);
  const isGstRegistered = Boolean(input.isGstRegistered);
  // Only honour the flag where the environment supports test-mode mirroring.
  const isTestRun =
    typeof input.isTestRun === "boolean" && isTestModeConfigured()
      ? input.isTestRun
      : undefined;

  const requestedOrgId = input.organisationId?.trim() || null;
  let updateOrganisationId: string | null = null;
  if (requestedOrgId) {
    const membership = await ctx.appDb.rls((tx) =>
      onboardingRepo.requireOwnerMembership(tx, ctx.userId, requestedOrgId),
    );
    if (!membership) {
      throw new Error("Organisation not found for this user");
    }
    updateOrganisationId = requestedOrgId;
  } else if (state.organisation) {
    updateOrganisationId = state.organisation.id;
  }

  if (updateOrganisationId) {
    const updated = await ctx.appDb.rls((tx) =>
      onboardingRepo.updateOrganisation(tx, updateOrganisationId, {
        name,
        abn,
        isGstRegistered,
        updatedAt: new Date().toISOString(),
      }),
    );

    if (!updated) {
      throw new Error("Failed to update organisation");
    }

    let setupProgress = parseSetupProgress(updated.setupProgress);
    if (isTestRun !== undefined && setupProgress.isTestRun !== isTestRun) {
      const merged = await ctx.appDb.rls((tx) =>
        onboardingRepo.mergeSetupProgress(
          tx,
          updated.id,
          { isTestRun },
          new Date().toISOString(),
        ),
      );
      setupProgress = parseSetupProgress(merged);
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      abn: updated.abn,
      isGstRegistered: updated.isGstRegistered,
      setupProgress,
    };
  }

  const slug = await ensureUniqueOrganisationSlug(ctx.appDb, name);
  const org = await onboardingRepo.insertOrganisation(ctx.appDb, {
    name,
    slug,
    abn,
    isGstRegistered,
    ...(isTestRun !== undefined ? { setupProgress: { isTestRun } } : {}),
  });

  if (!org) {
    throw new Error("Failed to create organisation");
  }

  await onboardingRepo.insertUserOrganisation(ctx.appDb, {
    userProfileId: ctx.userId,
    organisationId: org.id,
    roleId: PLATFORM_OWNER_ROLE_ID,
    joinedAt: new Date().toISOString(),
  });

  await ctx.appDb.rls((tx) => seedDefaultLeaveTypes(tx, org.id));

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    abn: org.abn,
    isGstRegistered: org.isGstRegistered,
    setupProgress: parseSetupProgress(org.setupProgress),
  };
}

function normalizeDataStartsFrom(input: string | undefined): string | null {
  if (!input?.trim()) {
    return null;
  }
  const value = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("dataStartsFrom must be YYYY-MM-DD");
  }
  return value;
}

export async function createOnboardingVenue(
  ctx: RequestAuthContext,
  input: {
    organisationId: string;
    name: string;
    addressLine1?: string | null;
    timezone?: string;
    dataStartsFrom?: string;
  },
): Promise<OnboardingVenueDto> {
  const state = await getOnboardingState(ctx);
  if (state.completed) {
    throw new Error("Setup already completed");
  }
  if (!state.organisation || state.organisation.id !== input.organisationId) {
    throw new Error("Organisation not found for this user");
  }
  if (!state.userOrganisationId) {
    throw new Error("Missing organisation membership");
  }

  const venueName = input.name.trim();
  if (!venueName) {
    throw new Error("Venue name is required");
  }

  const slug = await ensureUniqueVenueSlug(
    ctx.appDb,
    input.organisationId,
    venueName,
  );
  const timezone = input.timezone?.trim() || "Australia/Melbourne";
  const dataStartsFrom = normalizeDataStartsFrom(input.dataStartsFrom);

  const venue = await onboardingRepo.insertVenue(ctx.appDb, {
    organisationId: input.organisationId,
    name: venueName,
    slug,
    addressLine1: input.addressLine1?.trim() || null,
    timezone,
    dataStartsFrom,
  });

  if (!venue) {
    throw new Error("Failed to create venue");
  }

  await onboardingRepo.insertUserVenue(ctx.appDb, {
    userOrganisationId: state.userOrganisationId,
    organisationId: input.organisationId,
    venueId: venue.id,
    roleId: PLATFORM_OWNER_ROLE_ID,
  });

  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    timezone: venue.timezone,
    dataStartsFrom,
  };
}

export async function patchOnboardingProgress(
  ctx: RequestAuthContext,
  patch: OrganisationSetupProgress,
): Promise<OrganisationSetupProgress> {
  const state = await getOnboardingState(ctx);
  if (state.completed) {
    throw new Error("Setup already completed");
  }
  if (!state.organisation) {
    throw new Error("Create your organisation first");
  }

  const updatedAt = new Date().toISOString();
  const merged = await ctx.appDb.rls((tx) =>
    onboardingRepo.mergeSetupProgress(
      tx,
      state.organisation!.id,
      patch as Record<string, unknown>,
      updatedAt,
    ),
  );
  return parseSetupProgress(merged);
}

export async function finalizeOnboarding(ctx: RequestAuthContext): Promise<void> {
  const state = await getOnboardingState(ctx);
  if (state.completed) {
    throw new Error("Setup already completed");
  }
  if (!state.organisation || state.venues.length === 0) {
    throw new Error("Add business details and at least one venue before continuing");
  }

  const primaryVenue = state.venues[0]!;
  if (isSquareRequiredForFinalize()) {
    const squareOk = await venueHasSquareConnection(ctx, primaryVenue.id);
    if (!squareOk) {
      throw new Error("Connect Square POS before going live");
    }
  }

  const completedAt = new Date().toISOString();
  await onboardingRepo.markSetupCompleted(ctx.appDb, ctx.userId, completedAt);

  const setupCompletedAt = await ctx.appDb.rls((tx) =>
    onboardingRepo.getProfileSetupCompletedAt(tx, ctx.userId),
  );
  if (!setupCompletedAt) {
    throw new Error(
      "Could not mark setup as complete. Check that your user profile exists and is active.",
    );
  }
}

export function resolvePlatformRoleIdForSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized === "manager") {
    return PLATFORM_MANAGER_ROLE_ID;
  }
  return PLATFORM_CREW_ROLE_ID;
}
