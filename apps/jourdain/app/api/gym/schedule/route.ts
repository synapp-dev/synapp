import { NextRequest } from "next/server";
import { z } from "zod";
import { getSchedule, setScheduleDay } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const putSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  programId: z.string().uuid().nullable(),
});

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    return ok(await getSchedule(auth.supabase, auth.userId));
  } catch (err) {
    return serverError(err, "Failed to load schedule");
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const schedule = await setScheduleDay(
      auth.supabase,
      auth.userId,
      parsed.data.dayOfWeek,
      parsed.data.programId
    );
    return ok(schedule);
  } catch (err) {
    return serverError(err, "Failed to update schedule");
  }
}
