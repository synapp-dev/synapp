import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseMiddlewareClient } from "@workspace/supabase/middleware";

// TODO: Bind generated database types once they are set up:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
// types/supabase.ts is only a partial hand-written schema; adopting it here would
// break queries against tables it does not list.

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[intradark] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to refresh auth in middleware."
      );
    }
    return { response: NextResponse.next({ request }), user: null };
  }

  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  // Do not run code between createSupabaseMiddlewareClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  let user: User | null = null;
  try {
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    user = nextUser ?? null;
  } catch (error) {
    // e.g. AuthRetryableFetchError when Supabase is unreachable, URL is wrong,
    // or local `supabase start` is not running; still allow the app to load.
    if (process.env.NODE_ENV === "development") {
      console.warn("[intradark] Supabase auth in middleware failed:", error);
    }
  }

  const supabaseResponse = getResponse();

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return { response: supabaseResponse, user };
}
