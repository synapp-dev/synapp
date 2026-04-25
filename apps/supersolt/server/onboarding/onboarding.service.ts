import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OnboardingOrganisationDto,
  OnboardingStateResult,
  OnboardingVenueDto,
} from "@/entities/onboarding/model/types";
import type { Database } from "@/utils/supabase/types";
import {
  PLATFORM_CREW_ROLE_ID,
  PLATFORM_MANAGER_ROLE_ID,
  PLATFORM_OWNER_ROLE_ID,
} from "@/server/onboarding/constants";
import { ensureUniqueOrganisationSlug, ensureUniqueVenueSlug } from "@/server/onboarding/unique-slugs";

type Client = SupabaseClient<Database>;

async function requireOwnerOrganisationMembership(
  supabase: Client,
  userId: string,
  organisationId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", organisationId)
    .eq("role_id", PLATFORM_OWNER_ROLE_ID)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Organisation not found for this user");
  }
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

export type { OnboardingOrganisationDto, OnboardingStateResult, OnboardingVenueDto };

export async function getOnboardingState(
  supabase: Client,
  userId: string
): Promise<OnboardingStateResult> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("setup_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.setup_completed_at) {
    return { completed: true };
  }

  const { data: memberships, error: memError } = await supabase
    .from("user_organisations")
    .select("id, organisation_id")
    .eq("user_profile_id", userId)
    .eq("role_id", PLATFORM_OWNER_ROLE_ID)
    .eq("is_active", true)
    .is("archived_at", null);

  if (memError) {
    throw new Error(memError.message);
  }

  const typed = memberships ?? [];
  if (typed.length === 0) {
    return {
      completed: false,
      organisation: null,
      venues: [],
      userOrganisationId: null,
    };
  }

  const orgIds = [...new Set(typed.map((m) => m.organisation_id))];
  const { data: orgRows, error: orgError } = await supabase
    .from("organisations")
    .select("id, name, slug, abn, is_gst_registered, created_at")
    .in("id", orgIds)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (orgError) {
    throw new Error(orgError.message);
  }

  const org = orgRows?.[0];
  if (!org) {
    return {
      completed: false,
      organisation: null,
      venues: [],
      userOrganisationId: null,
    };
  }

  const userOrganisationId =
    typed.find((m) => m.organisation_id === org.id)?.id ?? null;

  const { data: venueRows, error: venueError } = await supabase
    .from("venues")
    .select("id, name, slug, timezone")
    .eq("organisation_id", org.id)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (venueError) {
    throw new Error(venueError.message);
  }

  const venues: OnboardingVenueDto[] = (venueRows ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    timezone: v.timezone,
  }));

  return {
    completed: false,
    organisation: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      abn: org.abn,
      isGstRegistered: org.is_gst_registered,
    },
    venues,
    userOrganisationId,
  };
}

export async function upsertOnboardingOrganisation(
  supabase: Client,
  userId: string,
  input: {
    name: string;
    abn?: string | null;
    isGstRegistered?: boolean;
    /** When set, must match an org the user owns as platform owner — always update that row (no second org). */
    organisationId?: string | null;
  },
): Promise<OnboardingOrganisationDto> {
  const state = await getOnboardingState(supabase, userId);
  if (state.completed) {
    throw new Error("Setup already completed");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Organisation name is required");
  }

  const abn = normalizeAbn(input.abn ?? undefined);
  const isGstRegistered = Boolean(input.isGstRegistered);

  const requestedOrgId = input.organisationId?.trim() || null;
  let updateOrganisationId: string | null = null;
  if (requestedOrgId) {
    await requireOwnerOrganisationMembership(supabase, userId, requestedOrgId);
    updateOrganisationId = requestedOrgId;
  } else if (state.organisation) {
    updateOrganisationId = state.organisation.id;
  }

  if (updateOrganisationId) {
    const { data: updated, error } = await supabase
      .from("organisations")
      .update({
        name,
        abn,
        is_gst_registered: isGstRegistered,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updateOrganisationId)
      .select("id, name, slug, abn, is_gst_registered")
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "Failed to update organisation");
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      abn: updated.abn,
      isGstRegistered: updated.is_gst_registered,
    };
  }

  const slug = await ensureUniqueOrganisationSlug(supabase, name);
  const { data: org, error: orgInsertError } = await supabase
    .from("organisations")
    .insert({
      name,
      slug,
      abn,
      is_gst_registered: isGstRegistered,
    })
    .select("id, name, slug, abn, is_gst_registered")
    .single();

  if (orgInsertError || !org) {
    throw new Error(orgInsertError?.message ?? "Failed to create organisation");
  }

  const { error: uoError } = await supabase.from("user_organisations").insert({
    user_profile_id: userId,
    organisation_id: org.id,
    role_id: PLATFORM_OWNER_ROLE_ID,
    joined_at: new Date().toISOString(),
  });

  if (uoError) {
    throw new Error(uoError.message);
  }

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    abn: org.abn,
    isGstRegistered: org.is_gst_registered,
  };
}

export async function createOnboardingVenue(
  supabase: Client,
  userId: string,
  input: {
    organisationId: string;
    name: string;
    addressLine1?: string | null;
    timezone?: string;
  }
): Promise<OnboardingVenueDto> {
  const state = await getOnboardingState(supabase, userId);
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

  const slug = await ensureUniqueVenueSlug(supabase, input.organisationId, venueName);
  const timezone = input.timezone?.trim() || "Australia/Melbourne";

  const { data: venue, error: vError } = await supabase
    .from("venues")
    .insert({
      organisation_id: input.organisationId,
      name: venueName,
      slug,
      address_line1: input.addressLine1?.trim() || null,
      timezone,
    })
    .select("id, name, slug, timezone")
    .single();

  if (vError || !venue) {
    throw new Error(vError?.message ?? "Failed to create venue");
  }

  const { error: uvError } = await supabase.from("user_venues").insert({
    user_organisation_id: state.userOrganisationId,
    organisation_id: input.organisationId,
    venue_id: venue.id,
    role_id: PLATFORM_OWNER_ROLE_ID,
  });

  if (uvError) {
    throw new Error(uvError.message);
  }

  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    timezone: venue.timezone,
  };
}

export async function finalizeOnboarding(
  supabase: Client,
  userId: string
): Promise<void> {
  const state = await getOnboardingState(supabase, userId);
  if (state.completed) {
    throw new Error("Setup already completed");
  }
  if (!state.organisation || state.venues.length === 0) {
    throw new Error("Add business details and at least one venue before continuing");
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      setup_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export function resolvePlatformRoleIdForSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized === "manager") {
    return PLATFORM_MANAGER_ROLE_ID;
  }
  return PLATFORM_CREW_ROLE_ID;
}
