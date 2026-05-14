const GRENADE_DB_VALUES = ["smoke", "molotov", "flashbang", "he"] as const;
export type UtilityLineupGrenadeDb = (typeof GRENADE_DB_VALUES)[number];

const GRENADE_STORAGE_FOLDERS = [
  "smoke",
  "molotov",
  "flashbang",
  "hegrenade",
] as const;
export type UtilityLineupGrenadeFolder = (typeof GRENADE_STORAGE_FOLDERS)[number];

const DB_TO_FOLDER: Record<UtilityLineupGrenadeDb, UtilityLineupGrenadeFolder> = {
  smoke: "smoke",
  molotov: "molotov",
  flashbang: "flashbang",
  he: "hegrenade",
};

export function isUtilityLineupGrenadeDb(
  v: string,
): v is UtilityLineupGrenadeDb {
  return (GRENADE_DB_VALUES as readonly string[]).includes(v);
}

export function grenadeDbToStorageFolder(
  grenadeType: UtilityLineupGrenadeDb,
): UtilityLineupGrenadeFolder {
  return DB_TO_FOLDER[grenadeType];
}

const MAP_SLUG_RE = /^[a-zA-Z0-9._-]+$/;

export function assertSafeMapSlugForStorage(mapSlug: string): void {
  if (!MAP_SLUG_RE.test(mapSlug)) {
    throw new Error("Invalid map slug.");
  }
}

/**
 * Object key under `intradark-media`: `utility/{mapSlug}/{grenadeFolder}/{fileName}`.
 * `fileName` must be caller-generated (e.g. UUID + extension).
 */
export function buildUtilityLineupVideoObjectPath(input: {
  mapSlug: string;
  grenadeType: UtilityLineupGrenadeDb;
  fileName: string;
}): string {
  assertSafeMapSlugForStorage(input.mapSlug);
  const folder = grenadeDbToStorageFolder(input.grenadeType);
  const file = input.fileName.trim().replace(/^\/+/, "");
  if (!file || file.includes("/") || file.includes("..")) {
    throw new Error("Invalid file name.");
  }
  return `utility/${input.mapSlug}/${folder}/${file}`;
}
