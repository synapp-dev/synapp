import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";

export function useVenueInvoicesQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  view?: "pending_review" | "all";
  fromDate?: string;
  toDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: invoiceKeys.list(
      input.organisationSlug,
      input.venueSlug,
      input.view ?? "all",
    ),
    queryFn: async () => {
      const res = await invoicesApi.list(input);
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? "Failed to load invoices");
      }
      return res.data;
    },
  });
}
