import { NextResponse } from "next/server";
import { ContentTypeError } from "@/server/content-types/content-types.service";

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  source_not_found: 404,
  duplicate_name: 409,
  in_use: 409,
  level_in_use: 409,
  default_protected: 409,
};

/**
 * Map a thrown error to an HTTP response. ContentTypeError codes carry their own
 * status (and the `code` is echoed in the body so clients can branch on it);
 * an "Unauthorized" message from the feature gate is a 403; everything else 500.
 */
export function contentTypeErrorResponse(e: any): NextResponse {
  if (e instanceof ContentTypeError) {
    return NextResponse.json(
      { error: e.message, code: e.code },
      { status: STATUS_BY_CODE[e.code] ?? 400 },
    );
  }
  if (typeof e?.message === "string" && e.message.includes("Unauthorized")) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  console.error(e);
  return NextResponse.json(
    { error: e?.message ?? "Internal error" },
    { status: 500 },
  );
}
