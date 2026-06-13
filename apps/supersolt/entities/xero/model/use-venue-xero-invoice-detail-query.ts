"use client";

import { useQuery } from "@tanstack/react-query";
import { xeroApi } from "@/entities/xero/api/endpoints";
import { xeroKeys } from "@/entities/xero/model/keys";
import type { VenueXeroInvoiceDetailPayload } from "@/entities/xero/model/invoice-types";

async function fetchVenueXeroInvoiceDetail(
  organisationSlug: string,
  venueSlug: string,
  invoiceId: string,
): Promise<VenueXeroInvoiceDetailPayload> {
  const res = await xeroApi.getInvoiceDetail({
    organisationSlug,
    venueSlug,
    invoiceId,
  });
  if (res.error || !res.data) {
    throw new Error(res.error?.message ?? "Failed to load invoice");
  }
  return res.data;
}

export function useVenueXeroInvoiceDetailQuery(args: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string | null;
}) {
  const { organisationSlug, venueSlug, invoiceId } = args;

  return useQuery({
    queryKey: xeroKeys.invoiceDetail(organisationSlug, venueSlug, invoiceId ?? ""),
    queryFn: () => fetchVenueXeroInvoiceDetail(organisationSlug, venueSlug, invoiceId!),
    enabled: Boolean(organisationSlug && venueSlug && invoiceId),
    staleTime: 60_000,
  });
}
