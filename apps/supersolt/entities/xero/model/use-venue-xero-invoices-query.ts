"use client";

import { useQuery } from "@tanstack/react-query";
import { xeroApi } from "@/entities/xero/api/endpoints";
import { xeroKeys } from "@/entities/xero/model/keys";
import type { XeroInvoicesListPayload } from "@/entities/xero/model/invoice-types";

async function fetchVenueXeroInvoices(
  organisationSlug: string,
  venueSlug: string,
  fromDate?: string,
  toDate?: string,
): Promise<XeroInvoicesListPayload> {
  const res = await xeroApi.listInvoices({
    organisationSlug,
    venueSlug,
    fromDate,
    toDate,
  });
  if (res.error || !res.data) {
    throw new Error(res.error?.message ?? "Failed to load invoices");
  }
  return res.data;
}

export function useVenueXeroInvoicesQuery(args: {
  organisationSlug: string;
  venueSlug: string;
  fromDate?: string;
  toDate?: string;
  enabled?: boolean;
}) {
  const { organisationSlug, venueSlug, fromDate, toDate, enabled = true } = args;

  return useQuery({
    queryKey: xeroKeys.invoices(organisationSlug, venueSlug, fromDate, toDate),
    queryFn: () => fetchVenueXeroInvoices(organisationSlug, venueSlug, fromDate, toDate),
    enabled: enabled && Boolean(organisationSlug && venueSlug),
  });
}
