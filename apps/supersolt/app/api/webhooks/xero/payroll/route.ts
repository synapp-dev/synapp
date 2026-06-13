import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { payrollService } from "@/server/workforce/payroll-export/payroll.service";

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.XERO_PAYROLL_WEBHOOK_KEY?.trim();
  if (!key || !signature) return process.env.NODE_ENV !== "production";

  const expected = createHmac("sha256", key).update(rawBody).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

type WebhookBody = {
  xeroPayRunId?: string;
  eventType?: string;
  events?: Array<{ resourceId?: string; eventType?: string }>;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-xero-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const appDb = createServiceAppDb();
  const events =
    body.events?.length && body.events.length > 0
      ? body.events
      : [{ resourceId: body.xeroPayRunId, eventType: body.eventType }];

  const results = [];
  for (const event of events) {
    if (!event.resourceId || !event.eventType) continue;
    const result = await payrollService.applyXeroWebhookEvent(appDb, {
      xeroPayRunId: event.resourceId,
      eventType: event.eventType,
    });
    results.push(result);
  }

  return jsonDataResponse(results);
}
