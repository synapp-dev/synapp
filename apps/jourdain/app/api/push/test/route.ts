import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { isPushConfigured, sendPushToUser } from "@/lib/push/server";

export async function POST() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  if (!isPushConfigured()) {
    return NextResponse.json(
      { data: null, error: { message: "Push is not configured on the server." } },
      { status: 503 }
    );
  }

  // "Jourdain" is already the iOS app-name header; keep the title as the message
  // so the notification doesn't read "Jourdain / Jourdain / ...".
  const result = await sendPushToUser(user.id, {
    title: "Push notifications are working 🎉",
    body: "",
    url: "/dashboard",
    tag: "test",
  });

  return NextResponse.json({ data: result, error: null });
}
