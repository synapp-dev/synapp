import { buildUtilityLineupEnemyPovObjectPath } from "@/lib/media/utility-lineup-enemy-pov-upload-path";
import {
  buildUtilityLineupVideoObjectPath,
  grenadeDbToStorageFolder,
  type UtilityLineupGrenadeDb,
} from "@/lib/media/utility-lineup-upload-path";

export type UtilityLineupUploadKind = "lineup" | "enemy_pov";

export function buildUploadObjectPath(
  kind: UtilityLineupUploadKind,
  input: {
    mapSlug: string;
    grenadeType: UtilityLineupGrenadeDb;
    fileName: string;
  },
): string {
  return kind === "enemy_pov"
    ? buildUtilityLineupEnemyPovObjectPath(input)
    : buildUtilityLineupVideoObjectPath(input);
}

function normalizeObjectPath(objectPath: string): string {
  return objectPath.trim().replace(/^\/+/, "");
}

function expectedPathSegments(
  kind: UtilityLineupUploadKind,
  mapSlug: string,
  grenadeType: UtilityLineupGrenadeDb,
): readonly string[] {
  const folder = grenadeDbToStorageFolder(grenadeType);
  return kind === "enemy_pov"
    ? ["utility", "enemy-pov", mapSlug, folder]
    : ["utility", mapSlug, folder];
}

/**
 * Validates a storage object path matches the submitted map slug + grenade type
 * for the given upload kind. Uses the same segment layout as
 * {@link buildUploadObjectPath} / the media path builders.
 */
export function uploadObjectPathMatchesSubmit(
  objectPath: string,
  mapSlug: string,
  grenadeType: UtilityLineupGrenadeDb,
  kind: UtilityLineupUploadKind = "lineup",
): boolean {
  const trimmed = normalizeObjectPath(objectPath);
  if (!trimmed || trimmed.includes("..")) return false;

  const parts = trimmed.split("/");
  const prefix = expectedPathSegments(kind, mapSlug, grenadeType);
  if (parts.length !== prefix.length + 1) return false;

  for (let i = 0; i < prefix.length; i++) {
    if (parts[i] !== prefix[i]) return false;
  }

  const fileName = parts[parts.length - 1]!;
  return fileName.length > 0 && !fileName.includes("/");
}
