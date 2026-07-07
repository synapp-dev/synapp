"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Receipt, Store, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney } from "@/lib/format";
import {
  categoryBreakdown,
  inMonth,
  isSpend,
  monthKey,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  topMerchants,
  round2,
} from "@/lib/finance/stats";
import type { Category } from "@/lib/finance/categorise";
import { useFinanceTransactions } from "@/hooks/finance/use-finance";
import { CATEGORY_META } from "@/components/finance/category-meta";
import { CategoryDonut } from "@/components/finance/category-donut";
import { CategoryPicker } from "@/components/finance/category-picker";
import { FinanceEmpty } from "@/components/finance/finance-empty";
import { MonthNav } from "@/components/finance/month-nav";

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-xs text-muted-foreground">new</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">flat</span>;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

export default function FinanceExpensesPage() {
  const { data: transactions, isLoading } = useFinanceTransactions();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [expanded, setExpanded] = useState<Category | null>(null);

  const all = useMemo(() => transactions ?? [], [transactions]);
  const earliest = useMemo(() => {
    let min: string | null = null;
    for (const t of all) {
      if (!t.date) continue;
      const key = monthKeyOf(t.date);
      if (!min || key < min) min = key;
    }
    return min ?? undefined;
  }, [all]);

  const breakdown = useMemo(() => categoryBreakdown(all, month), [all, month]);
  const previous = useMemo(
    () => categoryBreakdown(all, shiftMonth(month, -1)),
    [all, month]
  );
  const previousByCategory = useMemo(
    () => new Map(previous.map((entry) => [entry.category, entry.total])),
    [previous]
  );
  const total = round2(breakdown.reduce((sum, entry) => sum + entry.total, 0));
  const previousTotal = round2(
    previous.reduce((sum, entry) => sum + entry.total, 0)
  );
  const merchants = useMemo(() => topMerchants(all, month, 8), [all, month]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Monthly spending by category and merchant."
        icon={<Receipt className="h-6 w-6" />}
        actions={
          !isLoading && all.length > 0 ? (
            <MonthNav month={month} onChange={setMonth} earliest={earliest} />
          ) : undefined
        }
      />

      {isLoading ? (
        <ExpensesSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty message="Import a bank statement to break your spending down by category." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  {monthLabel(month, "long")} spending
                </CardTitle>
                <DeltaBadge current={total} previous={previousTotal} />
              </CardHeader>
              <CardContent>
                {breakdown.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No spending recorded for {monthLabel(month, "long")}.
                  </p>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <CategoryDonut
                      breakdown={breakdown}
                      total={total}
                      className="sm:w-56 sm:shrink-0"
                    />
                    <ul className="min-w-0 flex-1 space-y-0.5">
                      {breakdown.map((entry) => {
                        const meta = CATEGORY_META[entry.category];
                        const share =
                          total > 0 ? Math.round((entry.total / total) * 100) : 0;
                        const isOpen = expanded === entry.category;
                        const monthTxns = isOpen
                          ? all.filter(
                              (t) =>
                                isSpend(t) &&
                                inMonth(t, month) &&
                                t.category === entry.category
                            )
                          : [];
                        return (
                          <li key={entry.category}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(isOpen ? null : entry.category)
                              }
                              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                            >
                              <meta.icon
                                className="h-4 w-4 shrink-0"
                                style={{ color: meta.color }}
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {meta.label}
                              </span>
                              <span className="hidden text-xs text-muted-foreground sm:inline">
                                {share}%
                              </span>
                              <DeltaBadge
                                current={entry.total}
                                previous={previousByCategory.get(entry.category) ?? 0}
                              />
                              <span className="w-20 text-right font-semibold tabular-nums">
                                {formatMoney(entry.total)}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                                  isOpen && "rotate-180"
                                )}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen ? (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  {monthTxns.map((transaction) => (
                                    <li
                                      key={transaction.id}
                                      className="flex items-center gap-3 py-1.5 pl-9 pr-2 text-sm"
                                    >
                                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                                        {transaction.date
                                          ? formatDate(transaction.date, "short")
                                          : null}
                                      </span>
                                      <span
                                        className="min-w-0 flex-1 truncate"
                                        title={transaction.description}
                                      >
                                        {transaction.description}
                                      </span>
                                      <CategoryPicker transaction={transaction} />
                                      <span className="w-20 shrink-0 text-right tabular-nums">
                                        {formatMoney(-transaction.amount)}
                                      </span>
                                    </li>
                                  ))}
                                </motion.ul>
                              ) : null}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  Top merchants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {merchants.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing here for {monthLabel(month, "long")}.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {merchants.map((merchant, index) => (
                      <motion.li
                        key={merchant.merchant}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: CATEGORY_META[merchant.category].color,
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {merchant.merchant}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {merchant.count}x
                        </span>
                        <span className="w-20 text-right font-semibold tabular-nums">
                          {formatMoney(merchant.total)}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </section>
  );
}

function ExpensesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Skeleton className="h-96 rounded-xl lg:col-span-3" />
      <Skeleton className="h-96 rounded-xl lg:col-span-2" />
    </div>
  );
}
