import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const parsed = unsubscribeSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid endpoint" } },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", user.id);

  return NextResponse.json({ data: { unsubscribed: true }, error: null });
}
