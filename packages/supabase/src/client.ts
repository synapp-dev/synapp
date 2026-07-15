import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client bound to the workspace-standard env vars.
 * Bind your app's generated Database type at the call site:
 *   createSupabaseBrowserClient<Database>()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseBrowserClient<Database = any>() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}
