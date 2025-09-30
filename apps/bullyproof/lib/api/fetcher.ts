// lib/api/fetcher.ts
import type { RequestInit } from "next/dist/server/web/spec-extension/request";
import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: { message: string; status?: number } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

const isServer = typeof window === "undefined";

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);

  if (isServer) {
    const supabase = createServerClient();
    const {
      data: { session },
    } = await (await supabase).auth.getSession();
    const token = session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } else {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return { ...init, headers };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const req = await withAuth(init);

  // Construct absolute URL on the server (relative URLs fail in Node fetch)
  let url = `/api${path}`;
  if (isServer) {
    try {
      const { headers: nextHeaders } = await import("next/headers");
      const h = await nextHeaders();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host =
        h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
      url = `${proto}://${host}/api${path}`;
    } catch {
      // Fallback for environments without next/headers (e.g., tests)
      url = `http://localhost:3000/api${path}`;
    }
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

  if (!res.ok || body?.error) {
    return {
      data: null,
      error: body?.error ?? {
        message: `HTTP ${res.status}`,
        status: res.status,
      },
    };
  }
  const payload =
    body && typeof body === "object" && "data" in body
      ? (body as any).data
      : body;
  return { data: payload as T, error: null };
}
