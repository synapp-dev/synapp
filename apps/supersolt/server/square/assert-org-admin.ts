import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export async function userIsOrgAdmin(
  supabase: Supabase,
  userId: string,
  organisationId: string
): Promise<boolean> {
  const { data: membership, error } = await supabase
    .from("user_organisations")
    .select("role_id")
    .eq("user_profile_id", userId)
    .eq("organisation_id", organisationId)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !membership?.role_id) {
    return false;
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("grants_org_admin")
    .eq("id", membership.role_id)
    .maybeSingle();

  if (roleError || !role) {
    return false;
  }

  return role.grants_org_admin === true;
}
