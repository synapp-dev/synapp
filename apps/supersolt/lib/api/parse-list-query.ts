const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function parsePageSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? String(DEFAULT_PAGE));
  const pageSize = Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));

  return {
    page: Number.isFinite(page) ? page : DEFAULT_PAGE,
    pageSize: Number.isFinite(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

export function parseOptionalFilter(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key) ?? undefined;
  if (value === "all" || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

export function parseOptionalBoolean(
  searchParams: URLSearchParams,
  key: string,
): boolean | undefined {
  const value = searchParams.get(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseSuppliersListQuery(searchParams: URLSearchParams) {
  const { page, pageSize } = parsePageSearchParams(searchParams);
  const sort = searchParams.get("sort") as "name" | "last_invoice" | "ytd_spend" | null;

  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? undefined,
    category: parseOptionalFilter(searchParams, "category"),
    status: parseOptionalFilter(searchParams, "status"),
    archived: searchParams.get("archived") === "true",
    hasProducts: parseOptionalBoolean(searchParams, "hasProducts"),
    sort: sort ?? undefined,
  };
}

export function parseIngredientsListQuery(searchParams: URLSearchParams) {
  const { page, pageSize } = parsePageSearchParams(searchParams);

  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    supplierId: searchParams.get("supplierId") ?? undefined,
  };
}

export function parseRecipesListQuery(searchParams: URLSearchParams) {
  const { page, pageSize } = parsePageSearchParams(searchParams);

  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };
}

export function parseMenuItemsListQuery(searchParams: URLSearchParams) {
  const { page, pageSize } = parsePageSearchParams(searchParams);

  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? undefined,
    sectionName: searchParams.get("sectionName") ?? undefined,
  };
}
