import { checkEnv } from "@workspace/env-check";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  checkEnv({
    appName: "supersolt",
    required: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      "DATABASE_URL",
    ],
    oneOf: [["SUPABASE_ADMIN_KEY", "SUPABASE_SERVICE_ROLE_KEY"]],
    recommended: [
      "CRON_SECRET",
      "ANTHROPIC_API_KEY",
      "DATABASE_URL_POOLER",
      "SQUARE_APPLICATION_ID",
      "SQUARE_APPLICATION_SECRET",
      "XERO_CLIENT_ID",
      "XERO_CLIENT_SECRET",
      "POSTMARK_SERVER_TOKEN",
    ],
  });
}
