import { NextResponse } from "next/server";
import { schoolService } from "@/server/school/school.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * GET /api/schools/[id]/years
 * Returns year levels assigned to this school (from school_year_assignments).
 * Same shape as GET /api/curriculum/years: array of { year, level }.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: schoolId } = await params;
    const rows = await schoolService.getYearsForSchool({ userId }, schoolId);
    return NextResponse.json(rows, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    const status =
      message.includes("Unauthorized") || message.includes("permission")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
