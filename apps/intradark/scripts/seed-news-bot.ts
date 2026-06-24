/**
 * Creates (or finds) the dedicated "Intradark Newsdesk" bot account that owns
 * auto-ingested CS2 news articles, and prints its id for NEWS_BOT_USER_ID.
 *
 * Run: pnpm seed:news-bot
 */
import { createClient } from "@supabase/supabase-js";

const BOT_EMAIL = "newsdesk@intradark.local";
const BOT_USERNAME = "newsdesk";
const BOT_DISPLAY_NAME = "Intradark Newsdesk";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY in env (.env.local).",
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotent: reuse an existing bot profile if present.
  const existingProfile = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("username", BOT_USERNAME)
    .maybeSingle();

  let userId = existingProfile.data?.user_id as string | undefined;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: BOT_EMAIL,
      email_confirm: true,
      user_metadata: { display_name: BOT_DISPLAY_NAME, bot: true },
    });
    if (created.error) {
      throw new Error(`createUser failed: ${created.error.message}`);
    }
    userId = created.data.user?.id;
    if (!userId) throw new Error("createUser returned no user id.");
  }

  // Ensure the profile row exists (byline shows "Intradark Newsdesk").
  const upsert = await admin.from("user_profiles").upsert(
    {
      user_id: userId,
      username: BOT_USERNAME,
      display_name: BOT_DISPLAY_NAME,
    },
    { onConflict: "user_id" },
  );
  if (upsert.error) {
    throw new Error(`user_profiles upsert failed: ${upsert.error.message}`);
  }

  console.log("\n✅ News bot ready.\n");
  console.log("Add this to your env (.env.local and Vercel):\n");
  console.log(`NEWS_BOT_USER_ID=${userId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
