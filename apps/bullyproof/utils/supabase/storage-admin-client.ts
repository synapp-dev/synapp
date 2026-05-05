import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for Storage signing only (no cookies). Used so large files
 * never transit the Next.js / Vercel request body limit.
 */
export function createSupabaseStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
