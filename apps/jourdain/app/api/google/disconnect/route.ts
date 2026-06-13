import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createOAuthClient, getGoogleConnection } from "@/lib/google/client";

export async function POST() {
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
