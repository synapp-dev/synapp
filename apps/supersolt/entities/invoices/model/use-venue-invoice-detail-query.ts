import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";

export function useVenueInvoiceDetailQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string | null;
}) {
  return useQuery({
    queryKey: invoiceKeys.detail(
      input.organisationSlug,
      input.venueSlug,
      input.invoiceId ?? "",
    ),
    enabled: Boolean(input.invoiceId),
    queryFn: async () => {
      if (!input.invoiceId) throw new Error("No invoice id");
      const res = await invoicesApi.getDetail({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        invoiceId: input.invoiceId,
      });
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? "Failed to load invoice");
      }
      return res.data;
    },
  });
}
