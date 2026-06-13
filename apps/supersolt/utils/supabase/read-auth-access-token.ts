import { combineChunks, stringFromBase64URL } from "@supabase/ssr";
import { cookies } from "next/headers";

const BASE64_PREFIX = "base64-";

export function getSupabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }
  const ref = new URL(url).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

/**
 * Reads the Supabase session access token from auth cookies without calling
 * `auth.getSession()` (which logs an insecure-session warning on the server).
 */
export async function readAccessTokenFromAuthCookie(): Promise<string | null> {
  const key = getSupabaseAuthStorageKey();
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const raw = await combineChunks(key, async (chunkName) => {
    const cookie = all.find((entry) => entry.name === chunkName);
    return cookie?.value ?? null;
  });

  if (!raw) {
    return null;
  }

  let decoded = raw;
  if (raw.startsWith(BASE64_PREFIX)) {
    decoded = stringFromBase64URL(raw.substring(BASE64_PREFIX.length));
  }

  try {
    const parsed = JSON.parse(decoded) as { access_token?: string };
    return typeof parsed.access_token === "string" ? parsed.access_token : null;
  } catch {
    return null;
  }
}
