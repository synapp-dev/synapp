import { NextRequest } from "next/server";
import { z } from "zod";
import { setTrainingReminder } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const schema = z.object({
  enabled: z.boolean(),
  remindTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Expected HH:mm")
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const schedule = await setTrainingReminder(auth.supabase, auth.userId, parsed.data);
    return ok(schedule);
  } catch (err) {
    return serverError(err, "Failed to update training reminder");
  }
}
