/**
 * Supabase admin client for server-side operations requiring service role key
 * Use this for operations that require elevated permissions (e.g., creating users)
 */

import { createSupabaseAdminClient } from "@workspace/supabase/admin";
import type { Database } from "@/types/supabase";

export function createAdminClient() {
  const client = createSupabaseAdminClient<Database>(
    process.env.SUPABASE_ADMIN_KEY
  );
  if (!client) {
    throw new Error(
      "Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ADMIN_KEY are required."
    );
  }
  return client;
}
