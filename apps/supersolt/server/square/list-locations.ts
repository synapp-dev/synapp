import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";

export type SquareLocationSummary = {
  id: string;
  name: string;
  status: string;
};

type ListLocationsResponse = {
  locations?: Array<{
    id?: string;
    name?: string;
    status?: string;
  }>;
  errors?: Array<{ detail?: string; code?: string }>;
};

function apiBaseForStoredEnv(environment: string): string {
  const env = (environment === "production" ? "production" : "sandbox") as SquareEnvironment;
  return getSquareBaseUrl(env);
}

export async function listSquareLocations(args: {
  accessToken: string;
  storedEnvironment: string;
}): Promise<
  | { ok: true; locations: SquareLocationSummary[] }
  | { ok: false; message: string; status: number }
> {
  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const res = await fetch(`${base}/v2/locations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
    },
  });

  const body = (await res.json()) as ListLocationsResponse;

  if (!res.ok) {
    const detail =
      body.errors
        ?.map((e) => e.detail)
        .filter(Boolean)
        .join("; ") ?? `Square locations list failed (${res.status})`;
    return { ok: false, message: detail, status: res.status };
  }

  const locations = (body.locations ?? [])
    .map((location) => ({
      id: location.id?.trim() ?? "",
      name: location.name?.trim() ?? "Unnamed location",
      status: location.status?.trim() ?? "",
    }))
    .filter((location) => location.id.length > 0);

  return { ok: true, locations };
}

export function pickDefaultSquareLocation(
  locations: SquareLocationSummary[],
): SquareLocationSummary | null {
  const active = locations.filter((location) => location.status === "ACTIVE");
  const candidates = active.length > 0 ? active : locations;
  if (candidates.length === 1) {
    return candidates[0]!;
  }
  return null;
}
