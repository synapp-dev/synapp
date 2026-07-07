"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, TrendingDown, TrendingUp, Scale } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { monthLabel, monthlySeries, round2 } from "@/lib/finance/stats";
import { useFinanceTransactions } from "@/hooks/finance/use-finance";
import { FinanceEmpty } from "@/components/finance/finance-empty";
import { StatCard } from "@/components/finance/stat-card";

const cashflowConfig = {
  net: { label: "Net", color: "#3b82f6" },
} satisfies ChartConfig;

export default function FinanceCashflowPage() {
  const { data: transactions, isLoading } = useFinanceTransactions();
  const all = useMemo(() => transactions ?? [], [transactions]);
  const series = useMemo(() => monthlySeries(all, 12), [all]);

  const totalIn = round2(series.reduce((sum, entry) => sum + entry.income, 0));
  const totalOut = round2(series.reduce((sum, entry) => sum + entry.spend, 0));
  const totalNet = round2(totalIn - totalOut);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Cashflow"
        subtitle="Money in versus money out, trailing 12 months."
        icon={<ArrowDownUp className="h-6 w-6" />}
      />

      {isLoading ? (
        <CashflowSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty message="Import a bank statement to see your monthly cashflow here." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="In, 12 months"
              value={totalIn}
              icon={TrendingUp}
              tone="positive"
              delay={0}
            />
            <StatCard
              label="Out, 12 months"
              value={totalOut}
              icon={TrendingDown}
              tone="negative"
              delay={100}
            />
            <StatCard
              label="Net"
              value={totalNet}
              icon={Scale}
              tone={totalNet >= 0 ? "positive" : "negative"}
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
                <CardTitle className="text-base">Monthly net cashflow</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={cashflowConfig} className="h-64 w-full">
                  <BarChart data={series} margin={{ left: 4, right: 4 }}>
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
                      width={60}
                      tickFormatter={(value: number) =>
                        formatMoney(value).replace(/\.00$/, "")
                      }
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
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
                    <Bar dataKey="net" radius={[4, 4, 4, 4]}>
                      {series.map((entry) => (
                        <Cell
                          key={entry.month}
                          fill={entry.net >= 0 ? "#16a34a" : "#f43f5e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Month by month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">In</TableHead>
                        <TableHead className="text-right">Out</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...series].reverse().map((entry) => (
                        <TableRow key={entry.month}>
                          <TableCell className="font-medium">
                            {monthLabel(entry.month, "long")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-green-600 dark:text-green-500">
                            {entry.income > 0 ? formatMoney(entry.income) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.spend > 0 ? formatMoney(entry.spend) : "-"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold tabular-nums",
                              entry.net > 0 &&
                                "text-green-600 dark:text-green-500",
                              entry.net < 0 && "text-red-600 dark:text-red-500"
                            )}
                          >
                            {entry.income > 0 || entry.spend > 0
                              ? formatMoney(entry.net)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </section>
  );
}

function CashflowSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
