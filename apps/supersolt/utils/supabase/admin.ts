import { createSupabaseAdminClient } from "@workspace/supabase/admin";
import type { Database } from "@/utils/supabase/types";

/**
 * Service-role client (bypasses RLS). Use only in server routes after verifying the user may
 * access the venue — e.g. reading OAuth tokens for staff who are not org admins.
 * Returns null when NEXT_PUBLIC_SUPABASE_URL or the admin key is not configured.
 */
export function createSupabaseAdmin() {
  return createSupabaseAdminClient<Database>();
}
