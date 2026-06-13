import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";
const CATALOG_PAGE_TYPES = "ITEM,ITEM_VARIATION,CATEGORY,MODIFIER_LIST,MODIFIER";
const MAX_CATALOG_PAGES = 200;

export type SquareModifierListInfo = {
  modifier_list_id?: string;
  enabled?: boolean;
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
};

export type SquareCatalogObjectRaw = {
  type?: string;
  id?: string;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: {
    name?: string;
    description?: string;
    description_html?: string;
    description_plaintext?: string;
    category_id?: string;
    reporting_category?: { id?: string; ordinal?: number };
    categories?: Array<{ id?: string; ordinal?: number }>;
    variations?: Array<SquareCatalogObjectRaw | { id?: string; type?: string } | string>;
    modifier_list_info?: SquareModifierListInfo[];
  };
  item_variation_data?: {
    item_id?: string;
    name?: string;
    price_money?: { amount?: number; currency?: string };
    present_at_all_locations?: boolean;
    present_at_location_ids?: string[];
    location_overrides?: Array<{
      location_id?: string;
      sold_out?: boolean;
      price_money?: { amount?: number; currency?: string };
    }>;
  };
  category_data?: {
    name?: string;
  };
  modifier_list_data?: {
    name?: string;
    selection_type?: string;
    min_selected_modifiers?: number;
    max_selected_modifiers?: number;
    modifiers?: Array<SquareCatalogObjectRaw | { id?: string; type?: string }>;
  };
  modifier_data?: {
    name?: string;
    price_money?: { amount?: number; currency?: string };
    modifier_list_id?: string;
    ordinal?: number;
  };
};

type ListCatalogResponse = {
  objects?: SquareCatalogObjectRaw[];
  cursor?: string;
  errors?: Array<{ detail?: string; code?: string }>;
};

function apiBaseForStoredEnv(environment: string): string {
  const env = (environment === "production" ? "production" : "sandbox") as SquareEnvironment;
  return getSquareBaseUrl(env);
}

export async function listSquareCatalogPage(args: {
  accessToken: string;
  storedEnvironment: string;
  cursor?: string | null;
}): Promise<
  | { ok: true; objects: SquareCatalogObjectRaw[]; cursor: string | null }
  | { ok: false; message: string; status: number }
> {
  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const params = new URLSearchParams({ types: CATALOG_PAGE_TYPES });
  if (args.cursor) {
    params.set("cursor", args.cursor);
  }

  const res = await fetch(`${base}/v2/catalog/list?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
    },
  });

  const body = (await res.json()) as ListCatalogResponse;

  if (!res.ok) {
    const detail =
      body.errors
        ?.map((e) => e.detail)
        .filter(Boolean)
        .join("; ") ?? `Square catalog list failed (${res.status})`;
    return { ok: false, message: detail, status: res.status };
  }

  return {
    ok: true,
    objects: body.objects ?? [],
    cursor: body.cursor?.trim() || null,
  };
}

export async function fetchAllSquareCatalogObjects(args: {
  accessToken: string;
  storedEnvironment: string;
  onPage?: (progress: { current: number; total: number | null }) => Promise<void>;
}): Promise<
  | { ok: true; objects: SquareCatalogObjectRaw[]; pages: number }
  | { ok: false; message: string; status: number }
> {
  const all: SquareCatalogObjectRaw[] = [];
  let cursor: string | null = null;
  let pages = 0;

  while (pages < MAX_CATALOG_PAGES) {
    pages += 1;
    await args.onPage?.({ current: pages, total: null });

    const listed = await listSquareCatalogPage({
      accessToken: args.accessToken,
      storedEnvironment: args.storedEnvironment,
      cursor,
    });

    if (!listed.ok) {
      return listed;
    }

    all.push(...listed.objects);
    cursor = listed.cursor;
    if (!cursor) {
      break;
    }
  }

  if (pages >= MAX_CATALOG_PAGES && cursor) {
    return {
      ok: false,
      message: "Square catalog import truncated — too many pages",
      status: 500,
    };
  }

  return { ok: true, objects: all, pages };
}
