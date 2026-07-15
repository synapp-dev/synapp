/**
 * One-shot: upload an organisation logo to the public `org-logos` Supabase
 * bucket and set `organisations.logo_url` to its public URL.
 *
 * Run from apps/aviate with the service-role key available via .env.local:
 *   node --env-file=.env.local scripts/upload-org-logo.mjs menzies public/brand/menzies.svg
 *
 * Args: <org-slug> <path-to-image>
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [, , slug = "menzies", imagePath = "public/brand/menzies.svg"] =
  process.argv;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key.includes("your_")) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or a real SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const CONTENT_TYPES = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const ext = path.extname(imagePath).toLowerCase();
const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
const objectPath = `${slug}${ext}`;

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const bytes = await readFile(imagePath);

const { error: uploadError } = await supabase.storage
  .from("org-logos")
  .upload(objectPath, bytes, { contentType, upsert: true });

if (uploadError) {
  console.error("Upload failed:", uploadError.message);
  process.exit(1);
}

const {
  data: { publicUrl },
} = supabase.storage.from("org-logos").getPublicUrl(objectPath);

const { error: updateError } = await supabase
  .from("organisations")
  .update({ logo_url: publicUrl })
  .eq("slug", slug);

if (updateError) {
  console.error("Failed to set logo_url:", updateError.message);
  process.exit(1);
}

console.log(`Uploaded ${imagePath} → ${objectPath}`);
console.log(`organisations.logo_url (${slug}) = ${publicUrl}`);
