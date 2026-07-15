import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { createAdminClient } from "@/utils/supabase/admin";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

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
