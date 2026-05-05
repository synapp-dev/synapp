import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getResourcesAuthFromRequest(request);
    if (auth.kind !== "ok") {
      const { status, message } = resourcesAuthErrorStatus(auth);
      return NextResponse.json({ error: message }, { status });
    }

    const { id } = await params;
    const file = await resourcesService.finalizeDirectUpload(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id
    );
    return NextResponse.json(file, { status: 200 });
  } catch (e: unknown) {
    console.error("[resources/files/finalize-upload] POST error:", e);
    const err = e as { message?: string };
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
          ? 403
          : err.message === "File not found"
            ? 404
            : err.message?.includes("Folder") ||
                err.message?.includes("Upload did not reach")
              ? 400
              : 500;
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status }
    );
  }
}
