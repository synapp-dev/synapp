/** Parse Xero .NET `/Date(ms)/` or ISO date strings. */
export function parseXeroDate(value: string | undefined | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  const s = value.trim();
  const dotnet = /^\/Date\((\d+)(?:[+-]\d+)?\)\/$/.exec(s);
  if (dotnet) {
    const ms = Number(dotnet[1]);
    if (!Number.isFinite(ms)) {
      return null;
    }
    return new Date(ms).toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseXeroDateOnly(value: string | undefined | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  const s = value.trim();
  const datePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (datePrefix) {
    return datePrefix[1] ?? null;
  }
  const iso = parseXeroDate(value);
  if (!iso) {
    return null;
  }
  return iso.slice(0, 10);
}
