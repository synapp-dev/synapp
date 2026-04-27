import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export async function PATCH(
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
    const body = await request.json();
    const folder = await resourcesService.renameFolder(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id,
      body
    );
    return NextResponse.json(folder, { status: 200 });
  } catch (e: any) {
    console.error("[resources/folders/:id] PATCH error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "Folder not found"
            ? 404
            : e.message?.includes("Invalid")
              ? 400
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
    const auth = await getResourcesAuthFromRequest(request);
    if (auth.kind !== "ok") {
      const { status, message } = resourcesAuthErrorStatus(auth);
      return NextResponse.json({ error: message }, { status });
    }

    const { id } = await params;
    const result = await resourcesService.deleteFolder(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[resources/folders/:id] DELETE error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "Folder not found"
            ? 404
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
