import { NextRequest } from "next/server";
import { previewSessionPlan } from "@/lib/gym/service";
import { notFound, ok, requireUser, serverError } from "@/lib/gym/http";

/** The exercise list a session would start with, without persisting anything. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { programId } = await params;
  try {
    const preview = await previewSessionPlan(auth.supabase, auth.userId, programId);
    return preview ? ok(preview) : notFound("Program not found");
  } catch (err) {
    return serverError(err, "Failed to preview session");
  }
}
