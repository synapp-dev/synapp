import { createSupabaseServerClient } from "@workspace/supabase/server";

// TODO: Bind generated database types once they are set up:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts

export async function createServerClient() {
  return createSupabaseServerClient();
}
