import type { UserLineupFinalizeInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import { grenadeDbToStorageFolder } from "@/lib/media/utility-lineup-upload-path";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type UtilityLineupUploadKind = "lineup" | "enemy_pov";

/**
 * Validates the storage object path matches the submitted map slug + grenade type
 * for the given upload kind. `'lineup'` lives under `utility/{mapSlug}/{grenade}/...`,
 * `'enemy_pov'` under `utility/enemy-pov/{mapSlug}/{grenade}/...`.
 */
export function videoObjectPathMatchesSubmit(
  objectPath: string,
  mapSlug: string,
  grenadeType: UserLineupFinalizeInput["grenadeType"],
  kind: UtilityLineupUploadKind = "lineup",
): boolean {
  const trimmed = objectPath.trim().replace(/^\/+/, "");
  const folder = grenadeDbToStorageFolder(grenadeType);
  const prefix = kind === "enemy_pov" ? "utility/enemy-pov" : "utility";
  const re = new RegExp(
    `^${escapeRegExp(prefix)}/${escapeRegExp(mapSlug)}/${escapeRegExp(folder)}/[^/]+$`,
  );
  return re.test(trimmed);
}
