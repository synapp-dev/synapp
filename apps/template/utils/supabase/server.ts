import { createSupabaseServerClient } from "@workspace/supabase/server";
import type { Database } from "@/types/supabase";

export async function createServerClient() {
  return createSupabaseServerClient<Database>();
}
