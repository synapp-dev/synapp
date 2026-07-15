import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/utils/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Resolves the authenticated user for an API route handler.
 *
 * Usage:
 *   const { user, supabase, errorResponse } = await requireRequestUser();
 *   if (errorResponse) return errorResponse;
 */
export async function requireRequestUser(): Promise<
  | { user: User; supabase: ServerClient; errorResponse: null }
  | { user: null; supabase: null; errorResponse: NextResponse }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      supabase: null,
      errorResponse: NextResponse.json(
        { data: null, error: { message: "Unauthorized", status: 401 } },
        { status: 401 }
      ),
    };
  }

  return { user, supabase, errorResponse: null };
}
