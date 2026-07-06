/**
 * Government reporting overview route handler.
 *
 * GET /api/government/overview - platform-wide aggregate reporting for
 * GOVERNMENT_VIEWER stakeholders. View-only: no per-school detail.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { adminReportsService } from "@/server/reports/admin-reports.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await adminReportsService.getGovernmentOverview({ userId });
    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load government reporting";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
