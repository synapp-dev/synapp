"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarClock, RefreshCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { formatMoney, relativeTime } from "@/lib/format";
import { detectRecurring, round2, type Cadence } from "@/lib/finance/stats";
import { useFinanceTransactions } from "@/hooks/finance/use-finance";
import { CATEGORY_META } from "@/components/finance/category-meta";
import { FinanceEmpty } from "@/components/finance/finance-empty";
import { StatCard } from "@/components/finance/stat-card";

const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function FinanceSubscriptionsPage() {
  const { data: transactions, isLoading } = useFinanceTransactions();
  const all = useMemo(() => transactions ?? [], [transactions]);
  const recurring = useMemo(() => detectRecurring(all), [all]);
  const yearlyTotal = round2(
    recurring.reduce((sum, entry) => sum + entry.annualised, 0)
  );

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring payments detected from your transaction history."
        icon={<RefreshCcw className="h-6 w-6" />}
      />

      {isLoading ? (
        <SubscriptionsSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty message="Import a bank statement to find recurring charges automatically." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Estimated yearly cost"
              value={yearlyTotal}
              icon={CalendarClock}
              sub={`${recurring.length} recurring payment${recurring.length === 1 ? "" : "s"} detected`}
              delay={0}
              tone="negative"
            />
            <StatCard
              label="Per month, on average"
              value={round2(yearlyTotal / 12)}
              icon={RefreshCcw}
              delay={100}
            />
          </div>

          {recurring.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground"
            >
              No recurring payments detected yet. Detection needs at least three
              charges from the same merchant at a steady cadence.
            </motion.p>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detected subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recurring.map((entry, index) => {
                  const meta = CATEGORY_META[entry.category];
                  return (
                    <motion.div
                      key={entry.merchant}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.15 + index * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 sm:flex-nowrap"
                    >
                      <meta.icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: meta.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {entry.merchant}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CADENCE_LABELS[entry.cadence]} · {entry.charges} charges
                          {entry.lastCharged
                            ? ` · last ${relativeTime(entry.lastCharged)} ago`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-3 text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(entry.amount)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            / {entry.cadence === "yearly" ? "yr" : entry.cadence === "quarterly" ? "qtr" : entry.cadence === "monthly" ? "mo" : entry.cadence === "fortnightly" ? "fn" : "wk"}
                          </span>
                        </span>
                        <span className="w-24 text-sm tabular-nums text-muted-foreground">
                          {formatMoney(entry.annualised)}
                          <span className="ml-1 text-xs">/ yr</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
