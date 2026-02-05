/**
 * Supabase admin client for server-side operations requiring service role key
 * Use this for operations that require elevated permissions (e.g., creating users)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_ADMIN_KEY;

  if (!supabaseUrl || !adminKey) {
    throw new Error(
      "Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ADMIN_KEY are required."
    );
  }

  return createClient<Database>(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
