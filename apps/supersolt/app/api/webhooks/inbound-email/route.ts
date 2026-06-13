import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { processInboundEmail, type PostmarkInboundPayload } from "@/server/invoices/inbound-email.service";

function verifyPostmarkSignature(request: Request, rawBody: string): boolean {
  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = request.headers.get("x-postmark-signature");
  if (!signature) return false;

  const expected = createHash("sha256").update(rawBody + secret).digest("hex");
  return signature === expected;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyPostmarkSignature(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = JSON.parse(rawBody) as PostmarkInboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const appDb = createServiceAppDb();

  try {
    const result = await processInboundEmail(appDb, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[webhook/inbound-email]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 },
    );
  }
}
