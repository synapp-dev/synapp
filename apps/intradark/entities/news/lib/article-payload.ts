export const MAX_BODY_JSON_BYTES = 512 * 1024;

export type BodyJsonCode = "not_object" | "oversize" | "invalid_json";

export type BodyJsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; code: BodyJsonCode };

function byteLengthUtf8(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function parseAndValidateBodyJson(raw: unknown): BodyJsonResult {
  let parsed: unknown;

  if (typeof raw === "string") {
    if (byteLengthUtf8(raw) > MAX_BODY_JSON_BYTES) {
      return { ok: false, code: "oversize" };
    }
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, code: "invalid_json" };
    }
  } else {
    parsed = raw;
  }

  const serialized = JSON.stringify(parsed);
  if (byteLengthUtf8(serialized) > MAX_BODY_JSON_BYTES) {
    return { ok: false, code: "oversize" };
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return { ok: false, code: "not_object" };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
