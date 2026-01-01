// lib/api/fetcher.ts (server-only)
import type { RequestInit } from "next/dist/server/web/spec-extension/request";
import { createServerClient } from "@/utils/supabase/server";

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: { message: string; status?: number } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

// This module should only be imported in server code paths.

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);

  const supabase = createServerClient();
  const {
    data: { session },
  } = await (await supabase).auth.getSession();
  const token = session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return { ...init, headers };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const req = await withAuth(init);

  // Construct absolute URL on the server (relative URLs fail in Node fetch)
  let url = `/api${path}`;
  try {
    const { headers: nextHeaders } = await import("next/headers");
    const h = await nextHeaders();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    url = `${proto}://${host}/api${path}`;
  } catch {
    // Fallback for environments without next/headers (e.g., tests)
    url = `http://localhost:3000/api${path}`;
  }

  const res = await fetch(url, {
    ...req,
    headers: new Headers({
      "content-type": "application/json",
      ...Object.fromEntries(new Headers(req.headers)),
    }),
    cache: "no-store",
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {}

  if (!res.ok) {
    // Handle error responses
    const errorMessage =
      typeof body?.error === "string"
        ? body.error
        : body?.error?.message || `HTTP ${res.status}`;
    return {
      data: null,
      error: {
        message: errorMessage,
        status: res.status,
      },
    };
  }

  // Handle successful responses
  // API can return { data: T } or just T directly
  const payload =
    body && typeof body === "object" && "data" in body
      ? (body as any).data
      : body;
  return { data: payload as T, error: null };
}
