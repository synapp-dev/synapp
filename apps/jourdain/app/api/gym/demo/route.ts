import { z } from "zod";
import { clearDemoData, generateDemoData } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const schema = z.object({ action: z.enum(["generate", "clear"]) });

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid action");
  try {
    if (parsed.data.action === "generate") {
      const sets = await generateDemoData(auth.supabase, auth.userId);
      return ok({ sets });
    }
    await clearDemoData(auth.supabase, auth.userId);
    return ok({ sets: 0 });
  } catch (err) {
    return serverError(err, "Demo data failed");
  }
}
