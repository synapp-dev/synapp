import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export async function POST(request: Request) {
  try {
    const auth = await getResourcesAuthFromRequest(request);
    if (auth.kind !== "ok") {
      const { status, message } = resourcesAuthErrorStatus(auth);
      return NextResponse.json({ error: message }, { status });
    }

    const body = await request.json();
    const folder = await resourcesService.createFolder(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      body
    );
    return NextResponse.json(folder, { status: 201 });
  } catch (e: any) {
    console.error("[resources/folders] POST error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message?.includes("required") ||
              e.message?.includes("Invalid") ||
              e.message?.includes("match")
            ? 400
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
