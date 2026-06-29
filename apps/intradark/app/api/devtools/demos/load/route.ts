import { NextResponse } from "next/server";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { storeDemo, demoPathForToken } from "@/entities/demos/lib/storage";
import { runInsight } from "@/entities/demos/lib/insights";

/**
 * POST /api/devtools/demos/load   (multipart form-data, field `file`)
 * Stashes the uploaded .dem in a temp file and returns a reuse `token` plus the
 * parsed header so the harness can show match info immediately. Native parser →
 * Node runtime, never edge. Gated by `sandbox.access`.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = await guardDemoRoute();
  if (denied) return denied;

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Missing `file`" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const token = await storeDemo(bytes);

  // Parse the header eagerly so the harness shows match info on upload. A bad
  // file surfaces here rather than on the first insight click.
  let header: unknown = null;
  let headerError: string | null = null;
  try {
    header = runInsight("header", demoPathForToken(token));
  } catch (err) {
    headerError = err instanceof Error ? err.message : "Failed to parse header";
  }

  return NextResponse.json({
    token,
    fileName: file.name,
    sizeBytes: bytes.byteLength,
    header,
    headerError,
  });
}
