import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (Server Components, route handlers, server actions)
 * backed by the Next.js request cookie store.
 *
 * Pass `supabaseKey` to elevate (e.g. an admin key) while keeping cookie-based
 * session semantics; defaults to the publishable key.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSupabaseServerClient<Database = any>(options?: {
  supabaseKey?: string;
}) {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    options?.supabaseKey ??
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
