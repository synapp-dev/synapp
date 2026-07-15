import { type NextRequest } from "next/server";
import { Database } from "@/types/supabase";
import { createSupabaseMiddlewareClient } from "@workspace/supabase/middleware";

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } =
    createSupabaseMiddlewareClient<Database>(request);

  // Do not run code between createSupabaseMiddlewareClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()

  await supabase.auth.getUser();

  // IMPORTANT: You *must* return the response from getResponse() as it is,
  // or copy its cookies onto any replacement response (see
  // @workspace/supabase copySessionCookies). If this is not done, the browser
  // and server may go out of sync and terminate the user's session
  // prematurely!

  return getResponse();
}
