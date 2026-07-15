import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { createOAuthClient, getGoogleConnection } from "@/lib/google/client";

export async function POST() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const connection = await getGoogleConnection(user.id);
  if (connection) {
    try {
      await createOAuthClient().revokeToken(connection.refresh_token);
    } catch {
      // Token may already be revoked — still remove the connection.
    }
    const admin = createAdminClient();
    await admin.from("google_connections").delete().eq("user_id", user.id);
  }

  return NextResponse.json({ data: { disconnected: true }, error: null });
}
