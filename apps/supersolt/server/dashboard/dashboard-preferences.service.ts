import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/utils/supabase/types";

import type { DashboardPreferencesRow } from "@/entities/dashboard/model/dashboard-preferences-types";
import type { DashboardPreferencesPatch } from "@/server/dashboard/dashboard-preferences.schema";

type Supabase = SupabaseClient<Database>;

function rowFromDb(r: {
  time_window: string;
  venue_scope_mode: string;
  selected_venue_ids: string[] | null;
  custom_range_start: string | null;
  custom_range_end: string | null;
  updated_at: string;
}): DashboardPreferencesRow {
  return {
    timeWindow: r.time_window,
    venueScopeMode: r.venue_scope_mode,
    selectedVenueIds: r.selected_venue_ids,
    customRangeStart: r.custom_range_start,
    customRangeEnd: r.custom_range_end,
    updatedAt: r.updated_at,
  };
}

const DEFAULTS: DashboardPreferencesRow = {
  timeWindow: "today",
  venueScopeMode: "all",
  selectedVenueIds: null,
  customRangeStart: null,
  customRangeEnd: null,
  updatedAt: new Date(0).toISOString(),
};

export async function getDashboardPreferencesForUserOrg(
  supabase: Supabase,
  userId: string,
  organisationId: string,
): Promise<DashboardPreferencesRow> {
  const { data, error } = await supabase
    .from("dashboard_user_preferences")
    .select(
      "time_window, venue_scope_mode, selected_venue_ids, custom_range_start, custom_range_end, updated_at",
    )
    .eq("user_profile_id", userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return DEFAULTS;
  }
  return rowFromDb(data);
}

export async function upsertDashboardPreferencesForUserOrg(
  supabase: Supabase,
  userId: string,
  organisationId: string,
  patch: DashboardPreferencesPatch,
): Promise<DashboardPreferencesRow> {
  const payload = {
    user_profile_id: userId,
    organisation_id: organisationId,
    time_window: patch.timeWindow,
    venue_scope_mode: patch.venueScopeMode,
    selected_venue_ids:
      patch.venueScopeMode === "all"
        ? null
        : (patch.selectedVenueIds ?? null),
    custom_range_start:
      patch.timeWindow === "custom" ? patch.customRangeStart : null,
    custom_range_end:
      patch.timeWindow === "custom" ? patch.customRangeEnd : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("dashboard_user_preferences")
    .upsert(payload, { onConflict: "user_profile_id,organisation_id" })
    .select(
      "time_window, venue_scope_mode, selected_venue_ids, custom_range_start, custom_range_end, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowFromDb(data);
}

export async function resolveOrganisationIdForMemberSlug(
  supabase: Supabase,
  userId: string,
  organisationSlug: string,
): Promise<string | null> {
  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", organisationSlug)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }
  if (!org) {
    return null;
  }

  const { data: membership, error: memError } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", org.id)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (memError) {
    throw new Error(memError.message);
  }
  if (!membership) {
    return null;
  }

  return org.id;
}
