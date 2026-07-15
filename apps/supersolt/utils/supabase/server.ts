import { createSupabaseServerClient } from "@workspace/supabase/server";
import type { Database } from "@/utils/supabase/types";

export async function createServerClient() {
  return createSupabaseServerClient<Database>();
}
