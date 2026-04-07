import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import { buildMockSalesOrders } from "@/entities/sales-insights/model/mock-sales-data";

type GetOrdersInput = {
  organisationSlug: string;
  venueSlug: string;
  startIso: string;
  endIso: string;
};

const NETWORK_DELAY_MS = 150;

async function waitForMockLatency(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, NETWORK_DELAY_MS);
  });
}

export const salesInsightsApi = {
  get: {
    async orders(input: GetOrdersInput): Promise<SalesOrderRow[]> {
      await waitForMockLatency();
      return buildMockSalesOrders(input);
    },
  },
};
