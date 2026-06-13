import type { RequestAuthContext } from "@/server/auth/context";
import type { RlsTx } from "@/server/db/drizzle";
import {
  supplierRawItemsRepo,
  type InvoiceLineForAggregation,
} from "@/server/supplier-raw-items/supplier-raw-items.repo";

export type AggregateRawCatalogResult = {
  upserted: number;
  skipped: number;
};

export async function aggregateInvoiceLinesToRawCatalog(
  tx: RlsTx,
  args: {
    organisationId: string;
    venueId: string;
    userId: string;
    lines?: InvoiceLineForAggregation[];
  },
): Promise<AggregateRawCatalogResult> {
  const lines =
    args.lines ??
    (await supplierRawItemsRepo.listInvoiceLinesForAggregation(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
    }));

  let upserted = 0;
  let skipped = 0;

  for (const line of lines) {
    const result = await supplierRawItemsRepo.upsertFromLine(tx, {
      organisationId: args.organisationId,
      supplierId: line.supplierId,
      line,
      userId: args.userId,
    });
    if (result === "skipped") {
      skipped += 1;
    } else {
      upserted += 1;
    }
  }

  console.info("[supplier-raw-items] aggregated", {
    organisationId: args.organisationId,
    venueId: args.venueId,
    upserted,
    skipped,
    lineCount: lines.length,
  });

  return { upserted, skipped };
}

export async function aggregateInvoiceLinesToRawCatalogForVenue(
  ctx: RequestAuthContext,
  args: { organisationId: string; venueId: string },
): Promise<AggregateRawCatalogResult> {
  return ctx.appDb.rls((tx) =>
    aggregateInvoiceLinesToRawCatalog(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      userId: ctx.userId,
    }),
  );
}
