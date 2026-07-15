import { createSupabaseBrowserClient } from "@workspace/supabase/client";
import type { Database } from "@/utils/supabase/types";

export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>();
}
