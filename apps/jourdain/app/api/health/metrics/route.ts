import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getHealthMetrics } from "@/lib/health/service";

export async function GET(request: NextRequest) {
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

  const names = (request.nextUrl.searchParams.get("names") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const metrics = await getHealthMetrics(user.id, names);
  return NextResponse.json({ data: metrics, error: null });
}
