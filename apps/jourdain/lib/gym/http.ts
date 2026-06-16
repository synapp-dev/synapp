import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/utils/supabase/server";

// Small shared helpers for the gym API routes — keeps each handler to the
// auth → validate → service → { data, error } shape used across Jourdain.

type AuthOk = { supabase: SupabaseClient; userId: string; response: null };
type AuthErr = { supabase: null; userId: null; response: NextResponse };

export async function requireUser(): Promise<AuthOk | AuthErr> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      supabase: null,
      userId: null,
      response: NextResponse.json(
        { data: null, error: { message: "Unauthorized", status: 401 } },
        { status: 401 }
      ),
    };
  }
  return { supabase, userId: user.id, response: null };
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ data: null, error: { message } }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json(
    { data: null, error: { message, status: 404 } },
    { status: 404 }
  );
}

export function serverError(err: unknown, fallback: string): NextResponse {
  return NextResponse.json(
    { data: null, error: { message: err instanceof Error ? err.message : fallback } },
    { status: 500 }
  );
}
