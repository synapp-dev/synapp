/**
 * One-off seed: imports legacy news articles (a CSV snapshot exported from the
 * old Intradark site DB) into the new `news_articles` table.
 *
 * - HTML `content` -> TipTap `body_json` via the shared news schema (generateJSON),
 *   so embeds/images/marks match what the editor + reader expect.
 * - `public` -> status (true=published, false=draft); published rows keep their
 *   original `created_at` as `published_at`.
 * - Authors are mapped from old creator UUIDs to real users; the "Mike" author
 *   (Michael "ap0c" Aliferis) is created on first run (auth user + steam + profile).
 * - Idempotent: rows whose slug already exists are skipped, so reruns are safe.
 *
 * Run: pnpm seed:news-csv [path/to/articles_rows.csv]
 */
import { readFileSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { eq } from "drizzle-orm";

import { NEWS_TIPTAP_EXTENSIONS } from "@/entities/news/lib/tiptap-extensions";
import { slugifyTitle } from "@/entities/news/lib/slug";
import { client, db } from "@/server/db/drizzle";
import { newsArticles, userProfiles } from "@/server/db/schema";

const DEFAULT_CSV = "C:\\Users\\User\\Downloads\\articles_rows.csv";

// Old creator UUID -> resolver. jourdain maps to the existing account; Mike is
// created below. Anything unmapped falls back to jourdain.
const OLD_JOURDAIN = "765659ad-b753-470a-87c1-c7f1cb56ab3c";
const OLD_MIKE = "7828bf94-1225-4342-b0b9-719ec4bddf88";

// Michael "ap0c" Aliferis — the byline behind "Mike's Markings".
const MIKE = {
  username: "ap0c",
  displayName: "ap0c",
  firstName: "Michael",
  lastName: "Aliferis",
  email: "ap0c@intradark.local",
  steamid64: "76561198006179810",
};

/** steamid64 -> legacy STEAM_0:Y:Z (needed for the NOT NULL steam_profiles.steamid). */
function steamid64ToLegacy(steamid64: string): string {
  const base = 76561197960265728n;
  const account = BigInt(steamid64) - base;
  const y = account % 2n;
  const z = account / 2n;
  return `STEAM_0:${y}:${z}`;
}

// ---- Minimal RFC4180 CSV parser (handles quoted fields, "" escapes, commas
// and newlines inside quotes). Returns rows of string cells. ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // Normalize newlines.
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // Trailing cell/row (file may not end with a newline).
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  const [header, ...body] = rows;
  if (!header) return [];
  return body
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((key, i) => {
        obj[key] = r[i] ?? "";
      });
      return obj;
    });
}

function htmlToTiptap(html: string): JSONContent {
  const empty: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
  if (!html || html.trim().length === 0) return empty;
  try {
    return generateJSON(html, NEWS_TIPTAP_EXTENSIONS) as JSONContent;
  } catch (err) {
    console.warn("  ! generateJSON failed, using empty doc:", err);
    return empty;
  }
}

async function resolveUserIdByUsername(
  username: string,
): Promise<string | null> {
  const rows = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.username, username))
    .limit(1);
  return rows[0]?.userId ?? null;
}

/** Create (idempotently) the Michael "ap0c" Aliferis user, return its auth id. */
async function ensureMikeUser(admin: SupabaseClient): Promise<string> {
  const existing = await resolveUserIdByUsername(MIKE.username);
  if (existing) {
    console.log(`✓ Mike user already exists (${existing}).`);
    return existing;
  }

  // 1) steam_profiles row (user_profiles.steam_profile_id FKs to steamid64).
  const steamUpsert = await admin.from("steam_profiles").upsert(
    {
      steamid64: MIKE.steamid64,
      steamid: steamid64ToLegacy(MIKE.steamid64),
      personaname: MIKE.username,
      realname: `${MIKE.firstName} ${MIKE.lastName}`,
    },
    { onConflict: "steamid64" },
  );
  if (steamUpsert.error) {
    throw new Error(`steam_profiles upsert failed: ${steamUpsert.error.message}`);
  }

  // 2) auth user.
  const created = await admin.auth.admin.createUser({
    email: MIKE.email,
    email_confirm: true,
    user_metadata: { display_name: MIKE.displayName },
  });
  if (created.error) throw new Error(`createUser failed: ${created.error.message}`);
  const userId = created.data.user?.id;
  if (!userId) throw new Error("createUser returned no user id.");

  // 3) profile.
  const profileUpsert = await admin.from("user_profiles").upsert(
    {
      user_id: userId,
      username: MIKE.username,
      display_name: MIKE.displayName,
      first_name: MIKE.firstName,
      last_name: MIKE.lastName,
      email: MIKE.email,
      steam_profile_id: MIKE.steamid64,
    },
    { onConflict: "user_id" },
  );
  if (profileUpsert.error) {
    throw new Error(`user_profiles upsert failed: ${profileUpsert.error.message}`);
  }

  console.log(`✓ Created Mike user ${userId} (username "${MIKE.username}").`);
  return userId;
}

async function slugIsTaken(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: newsArticles.id })
    .from(newsArticles)
    .where(eq(newsArticles.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** Allocate a unique slug, suffixing -2, -3 … on collision. */
async function allocateSlug(title: string): Promise<string> {
  const base = slugifyTitle(title);
  if (!(await slugIsTaken(base))) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`;
    if (!(await slugIsTaken(candidate))) return candidate;
  }
  throw new Error(`Could not allocate a unique slug for "${title}".`);
}

async function main() {
  const csvPath = process.argv[2] ?? DEFAULT_CSV;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY (run via dotenv -e .env.local).",
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jourdainId = await resolveUserIdByUsername("jourdain");
  if (!jourdainId) throw new Error('No "jourdain" user_profile found.');
  const mikeId = await ensureMikeUser(admin);

  const authorFor = (oldCreator: string): string => {
    if (oldCreator === OLD_MIKE) return mikeId;
    if (oldCreator === OLD_JOURDAIN) return jourdainId;
    return jourdainId; // fallback
  };

  const rows = rowsToObjects(parseCsv(readFileSync(csvPath, "utf8")));
  console.log(`\nParsed ${rows.length} article(s) from ${csvPath}.\n`);

  let created = 0;
  let skipped = 0;
  for (const r of rows) {
    const title = r.title?.trim();
    if (!title) {
      skipped++;
      continue;
    }
    const preferred = slugifyTitle(title);
    if (await slugIsTaken(preferred)) {
      console.log(`- skip "${title}" (slug "${preferred}" already exists)`);
      skipped++;
      continue;
    }

    const slug = await allocateSlug(title);
    const isPublished = r.public?.trim().toLowerCase() === "true";
    const createdAt = new Date(r.created_at ?? Date.now()).toISOString();
    const bodyJson = htmlToTiptap(r.content ?? "");

    await db.insert(newsArticles).values({
      title: title.slice(0, 500),
      slug,
      excerpt: r.excerpt?.trim() ? r.excerpt.trim() : null,
      coverImageUrl: r.primary_image?.trim() ? r.primary_image.trim() : null,
      bodyJson,
      status: isPublished ? "published" : "draft",
      publishedAt: isPublished ? createdAt : null,
      authorUserId: authorFor(r.creator?.trim() ?? ""),
      createdAt,
      updatedAt: createdAt,
    });

    console.log(
      `+ ${isPublished ? "published" : "draft    "} "${title}" -> /news/${slug}`,
    );
    created++;
  }

  console.log(`\nDone. created=${created} skipped=${skipped}\n`);
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await client.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
