import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getGoogleConnection, isGoogleConfigured } from "@/lib/google/client";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const connection = await getGoogleConnection(user.id);
  return NextResponse.json({
    data: {
      configured: isGoogleConfigured(),
      connected: connection !== null,
      email: connection?.google_email ?? null,
    },
    error: null,
  });
}
