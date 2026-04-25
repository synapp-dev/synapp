import type {
  SalesInsightsMeta,
  SalesMixRow,
  SalesOrderRow,
  SquareInvoicesApiPayload,
} from "@/entities/sales-insights/model/types";

type GetOrdersInput = {
  organisationSlug: string;
  venueSlug: string;
  startIso: string;
  endIso: string;
};

export type SalesOrdersApiPayload = {
  orders: SalesOrderRow[];
  meta: SalesInsightsMeta;
  salesMix: SalesMixRow[];
};

export const salesInsightsApi = {
  get: {
    async orders(input: GetOrdersInput): Promise<SalesOrdersApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/sales-orders`;
      const qs = new URLSearchParams({
        start: input.startIso,
        end: input.endIso,
      });
      const res = await fetch(`${path}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const json = (await res.json()) as {
        data: SalesOrdersApiPayload | null;
        error: { message: string; status: number } | null;
      };

      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error?.message ?? `Sales request failed (${res.status})`);
      }

      return json.data;
    },

    async squareInvoices(input: GetOrdersInput): Promise<SquareInvoicesApiPayload> {
      const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/square-invoices`;
      const qs = new URLSearchParams({
        start: input.startIso,
        end: input.endIso,
      });
      const res = await fetch(`${path}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const json = (await res.json()) as {
        data: SquareInvoicesApiPayload | null;
        error: { message: string; status: number } | null;
      };

      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error?.message ?? `Square invoices request failed (${res.status})`);
      }

      return json.data;
    },
  },
};
