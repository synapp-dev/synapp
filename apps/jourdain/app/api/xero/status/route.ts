import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getXeroConnection, isXeroConfigured } from "@/lib/xero/client";

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

  const connection = await getXeroConnection(user.id);
  return NextResponse.json({
    data: {
      configured: isXeroConfigured(),
      connected: connection !== null,
      organisation: connection?.xero_tenant_name ?? null,
    },
    error: null,
  });
}
