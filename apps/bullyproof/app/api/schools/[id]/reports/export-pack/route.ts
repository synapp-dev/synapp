/**
 * School report export pack route handler.
 *
 * GET /api/schools/[id]/reports/export-pack - role-scoped report data
 * for the school portal Reports page (SOW 5.1.5 / 15.1.5). School admins and
 * licence accounts receive the school pack; teachers and staff receive their
 * personal slice only.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { reportExportPackService } from "@/server/reports/report-export-pack.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = await reportExportPackService.getSchoolExportPack(
      { userId },
      id
    );
    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to build report";
    const status = message.includes("Unauthorized")
      ? 403
      : message.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
