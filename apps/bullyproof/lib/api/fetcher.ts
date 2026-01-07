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

  // Check if body is FormData - if so, don't set content-type (browser will set it with boundary)
  const isFormData = req.body instanceof FormData;
  
  const headers = new Headers(req.headers);
  if (!isFormData) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, {
    ...req,
    headers,
    cache: "no-store",
  });

  // Read response as text first (to avoid stream consumption issues)
  const contentType = res.headers.get("content-type");
  const text = await res.text();
  
  let body: any = null;
  
  if (contentType?.includes("application/json")) {
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, return error with text content
      return {
        data: null,
        error: {
          message: `Invalid JSON response: ${text.substring(0, 100)}`,
          status: res.status,
        },
      };
    }
  } else {
    // Non-JSON response (likely an error page)
    return {
      data: null,
      error: {
        message: text || `HTTP ${res.status} ${res.statusText}`,
        status: res.status,
      },
    };
  }

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
