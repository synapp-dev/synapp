// lib/api/fetcher.client.ts
"use client";

import type { RequestInit } from "next/dist/server/web/spec-extension/request";
import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";
import { VIEW_AS_USER_ID_HEADER } from "@/lib/view-as-http";

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: { message: string; status?: number } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

function applyViewAsHeader(headers: Headers) {
  const viewAsId = useMeStore.getState().viewAsUser?.id;
  if (viewAsId) {
    headers.set(VIEW_AS_USER_ID_HEADER, viewAsId);
  }
}

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);

  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  applyViewAsHeader(headers);

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
  applyViewAsHeader(headers);
  return headers;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const req = await withAuth(init);
  const method = (req.method ?? "GET").toUpperCase();
  const isViewMode = useMeStore.getState().viewAsUser !== null;
  if (isViewMode && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    return {
      data: null,
      error: {
        message:
          "Read-only view mode is active. Stop viewing as another user to perform this action.",
        status: 403,
      },
    };
  }

  const url = `/api${path}`;

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

  if (!res.ok || body?.error) {
    // Routes return `{ error: string }`; normalise to `{ message, status }`
    // so callers reading error.message get the server's actual message.
    const rawError = body?.error;
    return {
      data: null,
      error:
        typeof rawError === "string"
          ? { message: rawError, status: res.status }
          : (rawError ?? { message: `HTTP ${res.status}`, status: res.status }),
    };
  }
  const payload =
    body && typeof body === "object" && "data" in body
      ? (body as any).data
      : body;
  return { data: payload as T, error: null };
}
