"use client";

import { useRouter } from "next/navigation";
import { Download, Plus, Upload } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { SupplierTruckAnimation } from "@/entities/suppliers/components/supplier-truck-animation";

/**
 * "Import your first supplier" picker (the inventory-setup suppliers entry point,
 * /suppliers/start). The Xero card routes to the dedicated, gated import page.
 */
export function ImportStartPicker({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const base = `/${organisation}/${venue}/settings/inventory-setup/suppliers`;

  const cards = [
    {
      key: "xero",
      icon: Download,
      title: "Import from Xero",
      description: "Pull in your supplier contacts and invoices automatically.",
      onClick: () => router.push(`${base}/xero-import`),
    },
    {
      key: "upload",
      icon: Upload,
      title: "Upload invoice",
      description: "We'll read it and pull out the supplier and items.",
      // The upload dialog lives on the suppliers list for now.
      onClick: () => router.push(base),
    },
    {
      key: "manual",
      icon: Plus,
      title: "Add manually",
      description: "Enter a supplier's contact and ordering details yourself.",
      onClick: () => router.push(base),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-10 text-center">
      <SupplierTruckAnimation className="mb-5 h-[16rem] w-[28rem] sm:h-[18rem] sm:w-[32rem]" />
      <h2 className="text-xl font-semibold">Import your first supplier</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick how you&apos;d like to get started.
      </p>

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={cn(
              "rounded-xl border p-6 text-center transition-colors",
              "hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
            )}
          >
            <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
              <card.icon className="text-muted-foreground size-5" />
            </div>
            <p className="mt-4 text-sm font-semibold">{card.title}</p>
            <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
