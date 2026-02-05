import { createBrowserClient as createClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton browser client to prevent creating too many connections
let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  return browserClient;
}
