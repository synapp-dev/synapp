import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { slugifyBase } from "@/server/onboarding/slug";

type Client = SupabaseClient<Database>;

export async function ensureUniqueOrganisationSlug(
  supabase: Client,
  name: string
): Promise<string> {
  const base = slugifyBase(name);
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data, error } = await supabase
      .from("organisations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error("Could not allocate a unique organisation slug");
}

export async function ensureUniqueVenueSlug(
  supabase: Client,
  organisationId: string,
  name: string
): Promise<string> {
  const base = slugifyBase(name);
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data, error } = await supabase
      .from("venues")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error("Could not allocate a unique venue slug");
}
