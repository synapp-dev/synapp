import { NextRequest } from "next/server";
import { z } from "zod";
import { addSessionExercise } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const schema = z.object({ exerciseId: z.string().uuid() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { sessionId } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const session = await addSessionExercise(
      auth.supabase,
      auth.userId,
      sessionId,
      parsed.data.exerciseId
    );
    return ok(session, 201);
  } catch (err) {
    return serverError(err, "Failed to add exercise");
  }
}
