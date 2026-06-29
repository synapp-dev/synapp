import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const ANON_COOKIE = "idk_anon_id";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Read the stable anonymous-viewer id from its first-party cookie, creating and
 * setting it when absent. Used to dedupe logged-out news views. Must be called
 * from a Server Action or Route Handler (it writes a cookie).
 */
export async function getOrCreateAnonId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(ANON_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}
