import { createSupabaseBrowserClient } from "@workspace/supabase/client";

// TODO: Bind generated database types once they are set up:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts

export function createBrowserClient() {
  return createSupabaseBrowserClient();
}
