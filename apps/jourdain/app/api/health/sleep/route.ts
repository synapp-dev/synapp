import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getSleepNights } from "@/lib/health/service";

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

  const nights = await getSleepNights(user.id);
  return NextResponse.json({ data: nights, error: null });
}
