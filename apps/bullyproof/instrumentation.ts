import { checkEnv } from "@workspace/env-check";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  checkEnv({
    appName: "bullyproof",
    required: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      "DATABASE_URL",
      "SUPABASE_ADMIN_KEY",
    ],
    recommended: [
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
      "TICKET_NOTIFY_EMAIL",
    ],
  });
}
