import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import type { CreatedOrganisationVenueDto } from "@/entities/venues/model/types";
import { ensureUniqueVenueSlug } from "@/server/onboarding/unique-slugs";
import { PLATFORM_OWNER_ROLE_ID } from "@/server/onboarding/constants";

type Client = SupabaseClient<Database>;

export class CreateOrganisationVenueError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CreateOrganisationVenueError";
  }
}

export async function createOrganisationVenueForOwner(
  supabase: Client,
  userId: string,
  input: {
    organisationSlug: string;
    name: string;
    addressLine1?: string | null;
    timezone?: string;
  }
): Promise<CreatedOrganisationVenueDto> {
  const organisationSlug = input.organisationSlug.trim();
  if (!organisationSlug) {
    throw new CreateOrganisationVenueError("Organisation slug is required", 400);
  }

  const venueName = input.name.trim();
  if (!venueName) {
    throw new CreateOrganisationVenueError("Venue name is required", 400);
  }

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("id, slug")
    .eq("slug", organisationSlug)
    .is("archived_at", null)
    .maybeSingle();

  if (orgError) {
    throw new CreateOrganisationVenueError(orgError.message, 500);
  }
  if (!org) {
    throw new CreateOrganisationVenueError("Organisation not found", 404);
  }

  const { data: membership, error: uoError } = await supabase
    .from("user_organisations")
    .select("id, role_id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", org.id)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (uoError) {
    throw new CreateOrganisationVenueError(uoError.message, 500);
  }
  if (!membership) {
    throw new CreateOrganisationVenueError("No access to this organisation", 403);
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("slug")
    .eq("id", membership.role_id)
    .is("archived_at", null)
    .maybeSingle();

  if (roleError) {
    throw new CreateOrganisationVenueError(roleError.message, 500);
  }
  if (roleRow?.slug !== "owner") {
    throw new CreateOrganisationVenueError("Only organisation owners can create venues", 403);
  }

  const slug = await ensureUniqueVenueSlug(supabase, org.id, venueName);
  const timezone = input.timezone?.trim() || "Australia/Melbourne";

  const { data: venue, error: vError } = await supabase
    .from("venues")
    .insert({
      organisation_id: org.id,
      name: venueName,
      slug,
      address_line1: input.addressLine1?.trim() || null,
      timezone,
    })
    .select("id, name, slug")
    .single();

  if (vError || !venue) {
    throw new CreateOrganisationVenueError(vError?.message ?? "Failed to create venue", 400);
  }

  const { error: uvError } = await supabase.from("user_venues").insert({
    user_organisation_id: membership.id,
    organisation_id: org.id,
    venue_id: venue.id,
    role_id: PLATFORM_OWNER_ROLE_ID,
  });

  if (uvError) {
    throw new CreateOrganisationVenueError(uvError.message, 400);
  }

  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    organisationSlug: org.slug,
  };
}
