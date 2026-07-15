import { createSupabaseServerClient } from "@workspace/supabase/server";

// TODO: Bind generated database types once they are set up:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
// types/supabase.ts is only a partial hand-written schema; adopting it here would
// break queries against tables it does not list.

export async function createServerClient() {
  return createSupabaseServerClient();
}
