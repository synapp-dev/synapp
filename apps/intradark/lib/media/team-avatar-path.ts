const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const extForMime: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Object path under `intradark-media`: `avatars/teams/{teamId}/{fileName}`. */
export function buildTeamAvatarObjectPath(input: {
  teamId: string;
  fileName: string;
}): string {
  const teamId = input.teamId.trim();
  if (!UUID_PATTERN.test(teamId)) {
    throw new Error("Invalid team id.");
  }
  const fileName = input.fileName.trim();
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("Invalid file name.");
  }
  return `avatars/teams/${teamId}/${fileName}`;
}

export function teamAvatarFileName(contentType: string): string | null {
  const ext = extForMime[contentType];
  if (!ext) return null;
  return `${crypto.randomUUID()}.${ext}`;
}

/**
 * Ensures the object path lives under the expected team folder.
 * Path must match `avatars/teams/{teamId}/…` (validated via {@link validateMediaObjectPath} first).
 */
export function assertTeamAvatarObjectPath(
  objectPath: string,
  teamId: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const expectedPrefix = `avatars/teams/${teamId.trim()}/`;
  if (!objectPath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Avatar path does not match this team." };
  }
  const rest = objectPath.slice(expectedPrefix.length);
  if (!rest || rest.includes("/")) {
    return { ok: false, error: "Avatar must be a file directly under the team folder." };
  }
  return { ok: true, path: objectPath };
}
