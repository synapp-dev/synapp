import { fetchXero } from "@/server/xero/xero-request-queue";
import type { XeroApiContact } from "@/server/xero/xero-contact-map";

const XERO_ACCOUNTING_CONTACTS_URL = "https://api.xero.com/api.xro/2.0/Contacts";

type XeroContactsResponse = {
  Contacts?: XeroApiContact[];
};

export async function listXeroSupplierContacts(args: {
  accessToken: string;
  tenantId: string;
}): Promise<
  | { ok: true; contacts: XeroApiContact[]; httpStatuses: number[] }
  | {
      ok: false;
      message: string;
      status: number;
      /** Seconds until Xero will accept calls again (from the 429 Retry-After). */
      retryAfterSeconds: number | null;
      /** Which Xero limit was hit: "minute" | "daily" | "app" (from the 429). */
      rateLimitProblem: string | null;
    }
> {
  const pageSize = 100;
  const collected: XeroApiContact[] = [];
  const httpStatuses: number[] = [];
  let page = 1;

  for (;;) {
    const q = new URLSearchParams({
      where: "IsSupplier==true",
      order: "Name ASC",
      page: String(page),
      pageSize: String(pageSize),
    });

    const res = await fetchXero(`${XERO_ACCOUNTING_CONTACTS_URL}?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        Accept: "application/json",
        "xero-tenant-id": args.tenantId,
      },
    });
    httpStatuses.push(res.status);

    if (!res.ok) {
      const text = await res.text();
      const retryAfterRaw = Number(res.headers.get("Retry-After"));
      const retryAfterSeconds =
        res.status === 429 && Number.isFinite(retryAfterRaw) && retryAfterRaw > 0
          ? retryAfterRaw
          : null;
      const rateLimitProblem =
        res.status === 429
          ? (res.headers.get("X-Rate-Limit-Problem") ?? null)
          : null;
      console.error("[xero] list contacts failed", {
        tenantId: args.tenantId,
        status: res.status,
        retryAfterSeconds,
        rateLimitProblem,
        body: text.slice(0, 500),
      });
      return {
        ok: false,
        message: text.slice(0, 500) || `Xero list contacts failed (${res.status})`,
        status: res.status,
        retryAfterSeconds,
        rateLimitProblem,
      };
    }

    const body = (await res.json()) as XeroContactsResponse;
    const batch = body.Contacts ?? [];
    collected.push(...batch);

    if (batch.length < pageSize) break;
    page += 1;
    if (page > 50) break;
  }

  console.info("[xero] list supplier contacts ok", {
    tenantId: args.tenantId,
    count: collected.length,
    httpStatuses,
  });

  return { ok: true, contacts: collected, httpStatuses };
}
