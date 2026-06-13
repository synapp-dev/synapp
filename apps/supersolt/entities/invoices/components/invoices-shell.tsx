"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useVenueInvoicesQuery } from "@/entities/invoices/model/use-venue-invoices-query";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PendingReviewQueue } from "./pending-review-queue";
import { AllInvoicesList } from "./all-invoices-list";
import { InvoiceUploadDialog } from "./invoice-upload-dialog";
import { InvoiceDetailPanel } from "./invoice-detail-panel";
import { useInvoiceSheetUrl } from "@/entities/invoices/lib/use-invoice-sheet-url";

type InvoicesShellProps = {
  organisation: string;
  venue: string;
};

export function InvoicesShell({ organisation, venue }: InvoicesShellProps) {
  const queryClient = useQueryClient();
  const { invoiceId, openInvoice, closeInvoice } = useInvoiceSheetUrl();
  const [tab, setTab] = useState<"pending_review" | "all">("pending_review");
  const integrationsHref = `/${organisation}/${venue}/settings/integrations`;

  const listQueryPending = useVenueInvoicesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    view: "pending_review",
  });

  const listQueryAll = useVenueInvoicesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    view: "all",
  });

  const listQuery = tab === "pending_review" ? listQueryPending : listQueryAll;

  const invoicePreview = useMemo(() => {
    if (!invoiceId) return null;
    const combined = [
      ...(listQueryPending.data?.invoices ?? []),
      ...(listQueryAll.data?.invoices ?? []),
    ];
    const seen = new Set<string>();
    for (const inv of combined) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      if (inv.id === invoiceId) return inv;
    }
    return null;
  }, [invoiceId, listQueryPending.data?.invoices, listQueryAll.data?.invoices]);

  const syncMutation = useMutation({
    mutationFn: () =>
      invoicesApi.syncFromXero({ organisationSlug: organisation, venueSlug: venue, daysBack: 90 }),
    onSuccess: (res) => {
      if (res.error || !res.data) {
        toast.error("Sync failed", { description: res.error?.message });
        return;
      }
      toast.success(`Synced ${res.data.synced} bill(s) from Xero`);
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
    onError: (e: Error) => toast.error("Sync failed", { description: e.message }),
  });

  const meta = listQuery.data?.meta;

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Invoices
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <InvoiceUploadDialog organisation={organisation} venue={venue} />
          {meta?.xeroConnected ? (
            <>
              {meta.tenantName ? (
                <span className="text-sm text-muted-foreground">Xero · {meta.tenantName}</span>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                Sync from Xero
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={integrationsHref}>Connect Xero</Link>
            </Button>
          )}
        </div>
      </div>

      {meta?.inboxAddress ? (
        <p className="text-sm text-muted-foreground">
          Supplier inbox: <span className="font-mono">{meta.inboxAddress}</span>
        </p>
      ) : null}

      {!meta?.xeroConnected ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Connect Xero or upload invoices manually
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-400/90">
            Email supplier bills to your venue inbox or use Upload invoice.
          </p>
        </div>
      ) : null}

      <Separator />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending_review" | "all")}>
        <TabsList>
          <TabsTrigger value="pending_review">
            Pending Review
            {meta?.pendingReviewCount ? ` (${meta.pendingReviewCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="pending_review" className="mt-4">
          <PendingReviewQueue
            organisation={organisation}
            venue={venue}
            listQuery={listQuery}
            onOpenInvoice={openInvoice}
          />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <AllInvoicesList
            organisation={organisation}
            venue={venue}
            listQuery={listQuery}
            onOpenInvoice={openInvoice}
          />
        </TabsContent>
      </Tabs>

      <InvoiceDetailPanel
        organisation={organisation}
        venue={venue}
        invoiceId={invoiceId}
        invoicePreview={invoicePreview}
        onClose={closeInvoice}
      />
    </section>
  );
}
