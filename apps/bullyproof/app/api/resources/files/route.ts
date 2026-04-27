import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await getResourcesAuthFromRequest(request);
    if (auth.kind !== "ok") {
      const { status, message } = resourcesAuthErrorStatus(auth);
      return NextResponse.json({ error: message }, { status });
    }

    const formData = await request.formData();
    const file = await resourcesService.uploadFile(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      formData
    );
    return NextResponse.json(file, { status: 201 });
  } catch (e: any) {
    console.error("[resources/files] POST error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message?.includes("required") ||
              e.message?.includes("empty") ||
              e.message?.includes("size limit") ||
              e.message?.includes("not found")
            ? 400
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
