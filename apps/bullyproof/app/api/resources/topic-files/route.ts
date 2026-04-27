import { NextResponse } from "next/server";
import { resourcesService } from "@/server/resources/resources.service";
import {
  getResourcesAuthFromRequest,
  resourcesAuthErrorStatus,
} from "@/server/lib/resources-request-auth";

export async function GET(request: Request) {
  try {
    const auth = await getResourcesAuthFromRequest(request);
    if (auth.kind !== "ok") {
      const { status, message } = resourcesAuthErrorStatus(auth);
      return NextResponse.json({ error: message }, { status });
    }

    const searchParams = new URL(request.url).searchParams;
    const topicId = searchParams.get("topicId");
    const schoolId = searchParams.get("schoolId");

    const files = await resourcesService.listTopicFiles(
      { userId: auth.userId, actorUserId: auth.actorUserId },
      { topicId, schoolId }
    );
    return NextResponse.json(files, { status: 200 });
  } catch (e: any) {
    console.error("[resources/topic-files] GET error:", e);
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
          ? 403
          : e.message === "Topic not found"
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
