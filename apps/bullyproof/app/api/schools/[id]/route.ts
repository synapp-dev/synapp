import { NextResponse } from "next/server";
import { schoolService } from "@/server/school/school.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

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

    console.log("school slug hit", id);
    const data = await schoolService.getSchoolBySlug({ userId }, id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updatedSchool = await schoolService.updateSchool({ userId }, id, body);

    if (!updatedSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSchool, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized")
        ? 403
        : e.message?.includes("not found")
          ? 404
          : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await schoolService.deleteSchool({ userId }, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized")
        ? 403
        : e.message?.includes("not found")
          ? 404
          : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
