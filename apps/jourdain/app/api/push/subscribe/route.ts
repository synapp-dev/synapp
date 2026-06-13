import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
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

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: "Invalid subscription" } },
      { status: 400 }
    );
  }

  const { endpoint, keys } = parsed.data;
  // Admin write keeps one row per endpoint regardless of which user owned it
  // before (a shared device can re-subscribe under a new account).
  const admin = createAdminClient();
  const { error: writeError } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (writeError) {
    return NextResponse.json(
      { data: null, error: { message: writeError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { subscribed: true }, error: null });
}
