import "server-only";

import type {
  CreateServerInput,
  CreateServerResponse,
  ListEggsResponse,
  ListLocationsResponse,
  ListServersResponse,
  RedlinePowerSignal,
  RedlineServerDetail,
  RedlineStatus,
} from "./types";

/**
 * Server-side client for the Redline Panel B2B API.
 *
 * The API key never leaves the server — browser code hits our own
 * `/api/redline/*` routes, which call this. Configure via env:
 *   REDLINE_API_KEY        Bearer token (issued by Redline)
 *   REDLINE_API_BASE_URL   optional, defaults to the public host
 */

const DEFAULT_BASE_URL = "https://api.redlinepanel.com";

export class RedlineNotConfiguredError extends Error {
  constructor() {
    super("REDLINE_API_KEY is not set — add it to .env.local to call Redline.");
    this.name = "RedlineNotConfiguredError";
  }
}

export class RedlineApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "RedlineApiError";
  }
}

export function isRedlineConfigured(): boolean {
  return Boolean(process.env.REDLINE_API_KEY);
}

function baseUrl(): string {
  return (process.env.REDLINE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

/**
 * Low-level fetch wrapper: injects the Bearer token, parses JSON, and turns
 * non-2xx responses into a `RedlineApiError` carrying the panel's error body.
 */
async function redlineFetch<T>(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<T> {
  const key = process.env.REDLINE_API_KEY;
  if (!key) throw new RedlineNotConfiguredError();

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    // Provisioning is never cacheable.
    cache: "no-store",
  });

  // 204 No Content (power, delete) — nothing to parse.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = text;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // leave as raw text
    }
  }

  if (!res.ok) {
    const detail =
      (body as { detail?: string; message?: string })?.detail ??
      (body as { message?: string })?.message ??
      res.statusText;
    throw new RedlineApiError(res.status, body, `Redline ${res.status}: ${detail}`);
  }

  return body as T;
}

export const redline = {
  listEggs: () => redlineFetch<ListEggsResponse>("/v1/eggs"),

  listEggLocations: (slug: string) =>
    redlineFetch<ListLocationsResponse>(
      `/v1/eggs/${encodeURIComponent(slug)}/locations`,
    ),

  listServers: () => redlineFetch<ListServersResponse>("/v1/servers"),

  createServer: (input: CreateServerInput) =>
    redlineFetch<CreateServerResponse>("/v1/servers", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getServer: (id: string) =>
    redlineFetch<RedlineServerDetail>(
      `/v1/servers/${encodeURIComponent(id)}`,
    ),

  getStatus: (id: string) =>
    redlineFetch<RedlineStatus>(
      `/v1/servers/${encodeURIComponent(id)}/status`,
    ),

  power: (id: string, signal: RedlinePowerSignal) =>
    redlineFetch<void>(`/v1/servers/${encodeURIComponent(id)}/power`, {
      method: "POST",
      body: JSON.stringify({ signal }),
    }),

  deleteServer: (id: string, force = false) =>
    redlineFetch<void>(
      `/v1/servers/${encodeURIComponent(id)}${force ? "?force=true" : ""}`,
      { method: "DELETE" },
    ),
};
