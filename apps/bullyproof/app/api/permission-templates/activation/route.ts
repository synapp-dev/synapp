import { NextResponse } from "next/server";
import {
  permissionTemplatesService,
  type ActivationTemplateKey,
} from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

const VALID_ACTIVATION_KEYS: ActivationTemplateKey[] = [
  "school-locked",
  "school-certification-enabled",
  "school-lessons-enabled",
];

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
    const { schoolId, activationKey } = body as {
      schoolId?: string;
      activationKey?: ActivationTemplateKey;
    };

    if (!schoolId || typeof schoolId !== "string") {
      return NextResponse.json(
        { error: "schoolId is required" },
        { status: 400 }
      );
    }
    if (!activationKey || !VALID_ACTIVATION_KEYS.includes(activationKey)) {
      return NextResponse.json(
        {
          error:
            "activationKey must be one of: school-locked, school-certification-enabled, school-lessons-enabled",
        },
        { status: 400 }
      );
    }

    const result = await permissionTemplatesService.applyActivationStage(
      { userId },
      activationKey,
      schoolId
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
