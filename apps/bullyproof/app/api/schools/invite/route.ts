import { NextRequest, NextResponse } from "next/server";
import { capitalizeSchoolName } from "@/utils/school-name";

// Log incoming request from Invite New School dialog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Capitalize school name as a safety measure
    if (body.name && typeof body.name === "string") {
      body.name = capitalizeSchoolName(body.name.trim());
    }
    
    // eslint-disable-next-line no-console
    console.log("[schools/invite] POST body:", body);

    return NextResponse.json({ ok: true, received: body });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
