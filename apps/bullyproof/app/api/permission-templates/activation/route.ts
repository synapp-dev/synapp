import { NextResponse } from "next/server";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await permissionTemplatesService.listActivationTemplates({
      userId,
    });
    return NextResponse.json({ templates }, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId, templateId } = body as {
      schoolId?: string;
      templateId?: string;
    };

    if (!schoolId || typeof schoolId !== "string") {
      return NextResponse.json(
        { error: "schoolId is required" },
        { status: 400 }
      );
    }
    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    const result = await permissionTemplatesService.applyActivationTemplate({
      userId,
    }, templateId, schoolId);
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
