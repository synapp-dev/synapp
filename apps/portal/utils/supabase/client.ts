import { createSupabaseBrowserClient } from "@workspace/supabase/client";
import type { Database } from "@/types/supabase";

export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>();
}
