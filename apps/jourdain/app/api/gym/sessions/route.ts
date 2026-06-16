import { NextRequest } from "next/server";
import { z } from "zod";
import { getActiveSession, listSessions, startSession } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const startSchema = z.object({
  programId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(200).optional(),
  exerciseIds: z.array(z.string().uuid()).max(40).optional(),
  intensity: z.enum(["normal", "hard"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    if (request.nextUrl.searchParams.get("active") === "1") {
      return ok(await getActiveSession(auth.supabase, auth.userId));
    }
    return ok(await listSessions(auth.supabase, auth.userId));
  } catch (err) {
    return serverError(err, "Failed to list sessions");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = startSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const session = await startSession(auth.supabase, auth.userId, parsed.data);
    return ok(session, 201);
  } catch (err) {
    return serverError(err, "Failed to start session");
  }
}
