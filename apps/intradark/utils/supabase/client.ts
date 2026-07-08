import { createBrowserClient as createClient } from "@supabase/ssr";
// import { Database } from "@/types/supabase";

// TODO: Add your database types once you have them set up
// You can generate types from Supabase using: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
// types/supabase.ts is only a partial hand-written schema; adopting it here would
// break queries against tables it does not list.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any; // Replace with your actual database types

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}
