import { createSupabaseServerClient } from "@workspace/supabase/server";
import type { Database } from "@/types/supabase";

/**
 * Cookie-backed server client elevated with the admin (service-role) key.
 * Bypasses RLS; server-side only.
 */
export async function createServerAdminClient() {
  return createSupabaseServerClient<Database>({
    supabaseKey: process.env.SUPABASE_ADMIN_KEY!,
  });
}
