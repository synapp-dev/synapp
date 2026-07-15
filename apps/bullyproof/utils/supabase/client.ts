import { createSupabaseBrowserClient } from "@workspace/supabase/client";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton browser client to prevent creating too many connections
let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createSupabaseBrowserClient<Database>();

  return browserClient;
}
