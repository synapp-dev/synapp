import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { adminReportsService } from "@/server/reports/admin-reports.service";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawSchoolId = searchParams.get("schoolId")?.trim() ?? "";
    const schoolId = rawSchoolId && UUID_RE.test(rawSchoolId) ? rawSchoolId : null;
    if (rawSchoolId && !schoolId) {
      return NextResponse.json(
        { error: "Invalid schoolId: expected UUID" },
        { status: 400 }
      );
    }

    const payload = await adminReportsService.getOverview(
      { userId },
      { schoolId }
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load reports overview";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
