import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { importHealth } from "@/lib/health/service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  // The export is a large JSON object; accept it as the request body directly.
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { data: null, error: { message: "No health export provided", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const summary = await importHealth(user.id, payload);
    return NextResponse.json({ data: summary, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err instanceof Error ? err.message : "Import failed" },
      },
      { status: 500 }
    );
  }
}
