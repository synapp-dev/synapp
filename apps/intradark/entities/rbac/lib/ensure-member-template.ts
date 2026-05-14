import type { SupabaseClient } from "@supabase/supabase-js";

import { ROLE_TEMPLATE_MEMBER_SLUG } from "./nav-slugs";

/**
 * Idempotent: grants the `member` navigation template to a profile (new signups / linking).
 */
export async function ensureMemberTemplateForProfileId(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<void> {
  const { data: templates, error: tErr } = await admin
    .from("role_templates")
    .select("id")
    .eq("slug", ROLE_TEMPLATE_MEMBER_SLUG)
    .maybeSingle();

  if (tErr || !templates?.id) {
    console.error("[rbac] ensureMemberTemplate: missing role_templates row", tErr);
    return;
  }

  const { error } = await admin.from("user_role_templates").insert({
    user_profile_id: userProfileId,
    template_id: templates.id,
  });

  if (error && error.code !== "23505") {
    console.error("[rbac] ensureMemberTemplate insert failed:", error);
  }
}
