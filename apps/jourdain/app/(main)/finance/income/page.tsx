"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Banknote, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney, relativeTime } from "@/lib/format";
import {
  incomeBySource,
  isIncome,
  monthKey,
  monthlySeries,
  round2,
} from "@/lib/finance/stats";
import { useFinanceTransactions } from "@/hooks/finance/use-finance";
import { CategoryPicker } from "@/components/finance/category-picker";
import { FinanceEmpty } from "@/components/finance/finance-empty";
import { StatCard } from "@/components/finance/stat-card";

const incomeConfig = {
  income: { label: "Income", color: "#16a34a" },
} satisfies ChartConfig;

export default function FinanceIncomePage() {
  const { data: transactions, isLoading } = useFinanceTransactions();
  const all = useMemo(() => transactions ?? [], [transactions]);

  const sources = useMemo(() => incomeBySource(all), [all]);
  const series = useMemo(() => monthlySeries(all, 12), [all]);
  const currentMonth = monthKey(new Date());
  const thisMonth = series.find((entry) => entry.month === currentMonth);
  const totalIncome = round2(
    all.filter(isIncome).reduce((sum, t) => sum + t.amount, 0)
  );
  const monthsWithIncome = series.filter((entry) => entry.income > 0).length;
  const monthlyAverage =
    monthsWithIncome > 0 ? round2(totalIncome / monthsWithIncome) : 0;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Income"
        subtitle="Everything coming in, grouped by source."
        icon={<Banknote className="h-6 w-6" />}
      />

      {isLoading ? (
        <IncomeSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty message="Import a bank statement to see your income sources here." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="This month"
              value={thisMonth?.income ?? 0}
              icon={TrendingUp}
              tone="positive"
              delay={0}
            />
            <StatCard
              label="Monthly average"
              value={monthlyAverage}
              icon={TrendingUp}
              sub={`Across ${monthsWithIncome} month${monthsWithIncome === 1 ? "" : "s"} with income`}
              delay={100}
            />
            <StatCard
              label="Total recorded"
              value={totalIncome}
              icon={Banknote}
              sub="Transfers excluded"
              delay={200}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Monthly income, last 12 months
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={incomeConfig} className="h-56 w-full">
                  <AreaChart data={series} margin={{ left: 4, right: 4 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={54}
                      tickFormatter={(value: number) =>
                        formatMoney(value).replace(/\.00$/, "")
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <span className="flex w-full items-center justify-between gap-3">
                              <span className="text-muted-foreground capitalize">
                                {name}
                              </span>
                              <span className="font-mono font-medium tabular-nums">
                                {formatMoney(Number(value))}
                              </span>
                            </span>
                          )}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#16a34a"
                      strokeWidth={2}
                      fill="url(#incomeFill)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-3">
            {sources.map((source, index) => (
              <motion.div
                key={source.source}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.4 + index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-baseline justify-between pb-2">
                    <CardTitle className="truncate text-base">
                      {source.source}
                    </CardTitle>
                    <div className="flex shrink-0 items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">
                        {source.count} payment{source.count === 1 ? "" : "s"}
                        {source.lastDate
                          ? ` · last ${relativeTime(source.lastDate)} ago`
                          : ""}
                      </span>
                      <span className="text-base font-semibold tabular-nums text-green-600 dark:text-green-500">
                        {formatMoney(source.total)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-0.5">
                    {source.transactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">
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
                        <span className="w-24 shrink-0 text-right font-medium tabular-nums text-green-600 dark:text-green-500">
                          {formatMoney(transaction.amount)}
                        </span>
                      </div>
                    ))}
                    {source.transactions.length > 5 ? (
                      <p className="px-2 pt-1 text-xs text-muted-foreground">
                        and {source.transactions.length - 5} more
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {sources.length === 0 ? (
              <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                No income transactions found yet.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function IncomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
