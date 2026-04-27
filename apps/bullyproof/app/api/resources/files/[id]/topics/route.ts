import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export async function GET(
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
    const topics = await resourcesService.listFileTopics(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id
    );
    return NextResponse.json(topics, { status: 200 });
  } catch (e: any) {
    console.error("[resources/files/:id/topics] GET error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "File not found"
            ? 404
            : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

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
    const body = await request.json();
    const result = await resourcesService.assignFileTopic(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id,
      body
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[resources/files/:id/topics] POST error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "File not found" || e.message === "Topic not found"
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
    const topicId = new URL(request.url).searchParams.get("topicId");
    if (!topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }

    const result = await resourcesService.removeFileTopic(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      id,
      topicId
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[resources/files/:id/topics] DELETE error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "File not found" || e.message === "Topic not found"
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
