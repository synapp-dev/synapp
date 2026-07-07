import { ok, requireUser, serverError } from "@/lib/gym/http";

export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const lastCheckinAt = new Date().toISOString();
  const { error } = await auth.supabase
    .from("notification_settings")
    .upsert(
      { user_id: auth.userId, last_checkin_at: lastCheckinAt },
      { onConflict: "user_id" }
    );
  if (error) return serverError(error, "Failed to complete check-in");

  return ok({ lastCheckinAt });
}
