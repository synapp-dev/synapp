import { checkEnv } from "@workspace/env-check";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  checkEnv({
    appName: "intradark",
    required: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      "DATABASE_URL",
      "SUPABASE_ADMIN_KEY",
    ],
    recommended: [
      "NEXT_PUBLIC_APP_URL",
      "STEAM_API_KEY",
      "CRON_SECRET",
      "REDLINE_API_KEY",
      "DISCORD_BOT_HTTP_SECRET",
      "AC_PAIRING_SECRET",
    ],
  });
}
