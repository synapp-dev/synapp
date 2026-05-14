import {
  assertSafeMapSlugForStorage,
  grenadeDbToStorageFolder,
  type UtilityLineupGrenadeDb,
} from "@/lib/media/utility-lineup-upload-path";

/**
 * Object key under `intradark-media`:
 * `utility/enemy-pov/{mapSlug}/{grenadeFolder}/{fileName}`. Mirrors the main lineup
 * layout but lives under the dedicated `enemy-pov` segment so storage policies and
 * moderation can target it independently. `fileName` must be caller-generated
 * (e.g. UUID + extension).
 */
export function buildUtilityLineupEnemyPovObjectPath(input: {
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
  return `utility/enemy-pov/${input.mapSlug}/${folder}/${file}`;
}
