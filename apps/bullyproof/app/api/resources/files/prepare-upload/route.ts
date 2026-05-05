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

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const result = await resourcesService.prepareDirectUpload(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      json
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    console.error("[resources/files/prepare-upload] POST error:", e);
    const err = e as { message?: string };
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
          ? 403
          : err.message?.includes("required") ||
              err.message?.includes("Invalid") ||
              err.message?.includes("Folder") ||
              err.message?.includes("limit") ||
              err.message?.includes("too_small") ||
              err.message?.includes("too_big")
            ? 400
            : 500;
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status }
    );
  }
}
