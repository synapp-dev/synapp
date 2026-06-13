import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-side only; never import from
 * client components. Used for tables with no client policies
 * (e.g. google_connections, which holds OAuth refresh tokens).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
