"use client";

import type { ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import {
  channelLabel,
  formatCurrency,
  formatDetailDateTime,
  formatSquareMoney,
  paymentLabel,
  sourceLabel,
  statusLabel,
} from "@/entities/sales-insights/lib/sales-format";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";

function HeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-emerald-50">
      {children}
    </span>
  );
}

function AmountRow({
  label,
  value,
  emphasis,
  negative,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={cn(
          "text-sm",
          emphasis ? "font-semibold" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          emphasis ? "text-base font-semibold" : "text-sm",
          negative && "text-rose-600 dark:text-rose-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TechField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="break-all font-mono text-xs">{value ?? "—"}</div>
    </div>
  );
}

export type SalesOrderDetailSheetProps = {
  order: SalesOrderRow | null;
  onOpenChange: (open: boolean) => void;
};

export function SalesOrderDetailSheet({
  order,
  onOpenChange,
}: SalesOrderDetailSheetProps) {
  const status = order ? statusLabel(order) : "Sale";
  const isRefund = status === "Refund";
  const isVoid = status === "Void";

  return (
    <Sheet open={order !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          // Fixed header + scrolling body: the sheet itself never scrolls, so
          // the scrollbar lives on the body and stops beneath the header.
          "mx-auto max-h-[88vh] w-full gap-0 overflow-hidden rounded-t-2xl border-x-0 border-t-0 p-0 sm:max-w-xl sm:border-x",
          "[&>button]:top-5 [&>button]:right-5 [&>button]:text-emerald-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
        )}
      >
        {order ? (
          <>
            {/* shrink-0: overflow-hidden zeroes this flex item's min-height, so
                flexbox would crush the hero when the sheet content overflows. */}
            <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-emerald-950 px-6 pb-6 pt-3 text-green-50">
              <div
                aria-hidden
                className="net-revenue-hero-shifting-blobs pointer-events-none absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div
                  aria-hidden
                  className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/25"
                />
                <SheetTitle className="truncate pr-10 text-xs font-medium uppercase tracking-wider text-emerald-200/90">
                  {status} · #{(order.order_number ?? order.id).slice(0, 14)}
                  {(order.order_number ?? order.id).length > 14 ? "…" : ""}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-xs text-emerald-200/70">
                  {formatDetailDateTime(order.order_datetime)}
                </SheetDescription>
                <p
                  className={cn(
                    "mt-3 text-5xl font-semibold leading-none tracking-tight tabular-nums",
                    isRefund ? "text-rose-200" : "text-white",
                    isVoid && "text-emerald-200/60 line-through",
                  )}
                >
                  {isRefund ? "-" : ""}
                  {formatCurrency(order.net_amount)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <HeroChip>{channelLabel(order.channel)}</HeroChip>
                  <HeroChip>{paymentLabel(order.payment_method)}</HeroChip>
                  <HeroChip>{sourceLabel(order.source)}</HeroChip>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-5">
                {order.refund_reason ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      Refund reason
                    </p>
                    <p className="mt-0.5">{order.refund_reason}</p>
                  </div>
                ) : null}

                {order.saleLineItems?.length ? (
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Items
                    </p>
                    <ul className="divide-y rounded-xl border">
                      {order.saleLineItems.map((li) => (
                        <li
                          key={li.lineUid}
                          className="flex items-start gap-3 px-4 py-2.5"
                        >
                          <span className="mt-0.5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                            {li.quantity.toLocaleString("en-AU", {
                              maximumFractionDigits: 2,
                            })}
                            ×
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium leading-snug">
                              {li.menuItemName ?? li.lineName}
                            </p>
                            {li.squareVariationName ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {li.squareVariationName}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-sm tabular-nums">
                            {formatCurrency(li.grossAmountCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Totals
                  </p>
                  <div className="space-y-2 rounded-xl border bg-muted/30 px-4 py-3">
                    <AmountRow
                      label="Gross"
                      value={formatCurrency(order.gross_amount)}
                    />
                    {order.discount_amount !== 0 ? (
                      <AmountRow
                        label="Discount"
                        value={`-${formatCurrency(order.discount_amount)}`}
                        negative
                      />
                    ) : null}
                    <AmountRow
                      label="Tax (incl.)"
                      value={formatCurrency(order.tax_amount)}
                    />
                    <Separator className="!my-3" />
                    <AmountRow
                      label={isRefund ? "Net refunded" : "Net"}
                      value={`${isRefund ? "-" : ""}${formatCurrency(order.net_amount)}`}
                      emphasis
                      negative={isRefund}
                    />
                  </div>
                </div>

                {order.square?.receiptUrl ? (
                  <Button asChild variant="outline" className="w-full gap-2">
                    <a
                      href={order.square.receiptUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open receipt in Square
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}

                <details className="group rounded-xl border">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                    Technical details
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t px-4 py-4 sm:grid-cols-2">
                    <TechField label="Internal id" value={order.id} />
                    <TechField
                      label="Source"
                      value={sourceLabel(order.source)}
                    />
                    {order.square ? (
                      <>
                        <TechField
                          label="Payment id"
                          value={order.square.squarePaymentId}
                        />
                        <TechField
                          label="API status"
                          value={order.square.status}
                        />
                        <TechField
                          label="Source type"
                          value={order.square.sourceType}
                        />
                        <TechField
                          label="Location id"
                          value={order.square.locationId}
                        />
                        <TechField
                          label="Order id (Square)"
                          value={order.square.orderId}
                        />
                        <TechField
                          label="Customer id"
                          value={order.square.customerId}
                        />
                        <TechField
                          label="Reference id"
                          value={order.square.referenceId}
                        />
                        <TechField
                          label="Receipt #"
                          value={order.square.receiptNumber}
                        />
                        <TechField
                          label="Created (API)"
                          value={
                            order.square.createdAt
                              ? formatDetailDateTime(order.square.createdAt)
                              : null
                          }
                        />
                        <TechField
                          label="Updated (API)"
                          value={
                            order.square.updatedAt
                              ? formatDetailDateTime(order.square.updatedAt)
                              : null
                          }
                        />
                        <TechField
                          label="Amount money"
                          value={formatSquareMoney(order.square.amountMoney)}
                        />
                        <TechField
                          label="Total money"
                          value={formatSquareMoney(order.square.totalMoney)}
                        />
                        <TechField
                          label="Refunded money"
                          value={formatSquareMoney(order.square.refundedMoney)}
                        />
                        {order.square.note ? (
                          <TechField label="Note" value={order.square.note} />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </details>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
