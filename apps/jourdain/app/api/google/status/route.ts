import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { getGoogleConnection, isGoogleConfigured } from "@/lib/google/client";

export async function GET() {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const connection = await getGoogleConnection(user.id);
  return NextResponse.json({
    data: {
      configured: isGoogleConfigured(),
      connected: connection !== null,
      email: connection?.google_email ?? null,
    },
    error: null,
  });
}
