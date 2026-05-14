/**
 * Standard Storage `upload()` (multipart) using the **service role** — bypasses your app’s
 * signed URL / TUS flow. Use to verify bucket + global limits vs a local file.
 *
 * Note: Hosted Supabase may still cap this path separately from TUS (`FILE_SIZE_LIMIT_STANDARD_UPLOAD`);
 * a failure here does not mean TUS is misconfigured.
 *
 * From apps/intradark (requires `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ADMIN_KEY`):
 *
 *   dotenv -e .env.local -- pnpm run storage:raw-upload-test -- ./video.mp4
 *   dotenv -e .env.local -- pnpm run storage:raw-upload-test -- ./video.mp4 utility/de_mirage/smoke/manual-test.mp4
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";

function contentTypeForPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  const [rawLocal, rawDest] = process.argv.slice(2);
  if (!rawLocal) {
    console.error(
      "Usage: pnpm run storage:raw-upload-test -- <local-file> [bucket-object-path]\n" +
        "Example: pnpm run storage:raw-upload-test -- ./clip.mp4",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY.");
    process.exit(1);
  }

  const localPath = resolve(process.cwd(), rawLocal);
  const body = await readFile(localPath);
  const dest =
    rawDest?.replace(/^\/+/, "") ||
    `utility/_smoke_test/${randomUUID()}${extname(localPath) || ".bin"}`;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const contentType = contentTypeForPath(localPath);
  console.log(`Uploading ${localPath} (${body.length} bytes, ${contentType}) → ${INTRADARK_MEDIA_BUCKET}/${dest}`);

  const { data, error } = await admin.storage.from(INTRADARK_MEDIA_BUCKET).upload(dest, body, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    console.error("Upload failed:", error.message, error);
    process.exit(1);
  }

  const pub = `${url.replace(/\/+$/, "")}/storage/v1/object/public/${INTRADARK_MEDIA_BUCKET}/${dest
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;

  console.log("OK:", data?.path ?? dest);
  console.log("Public URL:", pub);
}

void main();
