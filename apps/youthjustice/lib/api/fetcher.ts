import type { RequestInit } from "next/dist/server/web/spec-extension/request";
import { createServerClient } from "@/utils/supabase/server";

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: { message: string; status?: number } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return { ...init, headers };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const req = await withAuth(init);

  let url = `/api${path}`;
  try {
    const { headers: getHeaders } = await import("next/headers");
    const headers = await getHeaders();
    const protocol = headers.get("x-forwarded-proto") ?? "http";
    const host = headers.get("x-forwarded-host") ?? headers.get("host");
    url = `${protocol}://${host ?? "localhost:3006"}/api${path}`;
  } catch {
    url = `http://localhost:3006/api${path}`;
  }

  const isFormData = req.body instanceof FormData;
  const headers = new Headers(req.headers);
  if (!isFormData) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...req,
    headers,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");
  const text = await response.text();

  let body: unknown = null;
  if (contentType?.includes("application/json")) {
    try {
      body = JSON.parse(text);
    } catch {
      return {
        data: null,
        error: {
          message: `Invalid JSON response: ${text.substring(0, 100)}`,
          status: response.status,
        },
      };
    }
  } else if (!response.ok) {
    return {
      data: null,
      error: {
        message: text || `HTTP ${response.status} ${response.statusText}`,
        status: response.status,
      },
    };
  }

  if (!response.ok) {
    const apiError = body as { error?: { message?: string } } | null;
    return {
      data: null,
      error: {
        message: apiError?.error?.message ?? `HTTP ${response.status}`,
        status: response.status,
      },
    };
  }

  const payload =
    body && typeof body === "object" && "data" in body
      ? (body as { data: T }).data
      : (body as T);

  return { data: payload, error: null };
}
