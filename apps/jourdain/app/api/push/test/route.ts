import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { isPushConfigured, sendPushToUser } from "@/lib/push/server";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { data: null, error: { message: "Push is not configured on the server." } },
      { status: 503 }
    );
  }

  const result = await sendPushToUser(user.id, {
    title: "Jourdain",
    body: "Push notifications are working. 🎉",
    url: "/dashboard",
    tag: "test",
  });

  return NextResponse.json({ data: result, error: null });
}
