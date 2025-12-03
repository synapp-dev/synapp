// lib/api/fetcher.client.ts
"use client";

import type { RequestInit } from "next/dist/server/web/spec-extension/request";
import { createBrowserClient } from "@/utils/supabase/client";

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: { message: string; status?: number } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);

  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return { ...init, headers };
}

// Export helper function to get auth token for use with FormData requests
export async function getAuthHeaders(): Promise<Headers> {
  const headers = new Headers();
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const req = await withAuth(init);

  const url = `/api${path}`;

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
