import { createSupabaseAdminClient } from "@workspace/supabase/admin";

/**
 * Service-role client (bypasses RLS). Server-side only; never import from
 * client components. Used for tables with no client policies
 * (e.g. google_connections, which holds OAuth refresh tokens).
 */
export function createAdminClient() {
  const client = createSupabaseAdminClient(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!client) {
    throw new Error(
      "Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }
  return client;
}
