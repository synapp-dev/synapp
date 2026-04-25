import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// import { Database } from "@/types/supabase";

// TODO: Add your database types once you have them set up
// You can generate types from Supabase using: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
type Database = any; // Replace with your actual database types

export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
