const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const extForMime: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Object path under `intradark-media`: `news/{articleId}/{fileName}`. */
export function buildNewsCoverObjectPath(input: {
  articleId: string;
  fileName: string;
}): string {
  const articleId = input.articleId.trim();
  if (!UUID_PATTERN.test(articleId)) {
    throw new Error("Invalid article id.");
  }
  const fileName = input.fileName.trim();
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("Invalid file name.");
  }
  return `news/${articleId}/${fileName}`;
}

export function newsCoverFileName(contentType: string): string | null {
  const ext = extForMime[contentType];
  if (!ext) return null;
  return `cover-${crypto.randomUUID()}.${ext}`;
}

/**
 * Ensures the object path lives under the expected article folder.
 * Path must match `news/{articleId}/…` (validate via `validateMediaObjectPath` first).
 */
export function assertNewsCoverObjectPath(
  objectPath: string,
  articleId: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const expectedPrefix = `news/${articleId.trim()}/`;
  if (!objectPath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Cover path does not match this article." };
  }
  const rest = objectPath.slice(expectedPrefix.length);
  if (!rest || rest.includes("/")) {
    return {
      ok: false,
      error: "Cover must be a file directly under the article folder.",
    };
  }
  return { ok: true, path: objectPath };
}
