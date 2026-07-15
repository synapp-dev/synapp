import { createClient } from "@supabase/supabase-js";

/**
 * Resolves the service-role key from the two env var names used across the
 * workspace (SUPABASE_ADMIN_KEY, then SUPABASE_SERVICE_ROLE_KEY).
 */
export function resolveSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_ADMIN_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

/**
 * Service-role client (bypasses RLS). Server-side only; never import from
 * client components. Returns null when the URL or key is not configured so
 * callers decide whether missing config is fatal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseAdminClient<Database = any>(
  key: string | undefined = resolveSupabaseServiceRoleKey()
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
