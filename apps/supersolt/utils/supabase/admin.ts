import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

/**
 * Service-role client (bypasses RLS). Use only in server routes after verifying the user may
 * access the venue — e.g. reading OAuth tokens for staff who are not org admins.
 */
function resolveServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_ADMIN_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function createSupabaseAdmin(): ReturnType<typeof createClient<Database>> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = resolveServiceRoleKey();
  if (!url || !key) {
    return null;
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
