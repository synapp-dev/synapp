import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { importHealth } from "@/lib/health/service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
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

  // The export is a large JSON object; accept it as the request body directly.
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { data: null, error: { message: "No health export provided", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const summary = await importHealth(user.id, payload);
    return NextResponse.json({ data: summary, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Import failed" },
      },
      { status: 500 }
    );
  }
}
