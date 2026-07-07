"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  Landmark,
  PiggyBank,
  Receipt,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney } from "@/lib/format";
import {
  categoryBreakdown,
  monthKey,
  monthLabel,
  monthlySeries,
} from "@/lib/finance/stats";
import { useBankAccounts } from "@/hooks/bank/use-bank";
import { useFinanceTransactions } from "@/hooks/finance/use-finance";
import { CATEGORY_META } from "@/components/finance/category-meta";
import { CategoryDonut } from "@/components/finance/category-donut";
import { CategoryPicker } from "@/components/finance/category-picker";
import { FinanceEmpty } from "@/components/finance/finance-empty";
import { StatCard } from "@/components/finance/stat-card";

const flowConfig = {
  income: { label: "Income", color: "#16a34a" },
  spend: { label: "Spend", color: "#f43f5e" },
} satisfies ChartConfig;

const QUICK_LINKS = [
  { href: "/finance/expenses", label: "Expenses", icon: Receipt },
  { href: "/finance/income", label: "Income", icon: TrendingUp },
  { href: "/finance/cashflow", label: "Cashflow", icon: ArrowDownUp },
  { href: "/finance/subscriptions", label: "Subscriptions", icon: RefreshCcw },
  { href: "/finance/budget", label: "Budget", icon: PiggyBank },
  { href: "/finance/accounts", label: "Accounts", icon: Landmark },
];

const STAGGER_MS = 100;

function sectionMotion(order: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.45,
      delay: (order * STAGGER_MS) / 1000,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };
}

export default function FinanceOverviewPage() {
  const { data: accounts, isLoading: accountsLoading } = useBankAccounts();
  const { data: transactions, isLoading: txLoading } = useFinanceTransactions();

  const isLoading = accountsLoading || txLoading;
  const all = transactions ?? [];
  const currentMonth = monthKey(new Date());

  const netBalance = (accounts ?? []).reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0
  );
  const series = monthlySeries(all, 6);
  const thisMonth = series[series.length - 1];
  const breakdown = categoryBreakdown(all, currentMonth);
  const monthSpendTotal = breakdown.reduce((sum, c) => sum + c.total, 0);
  const recent = all.filter((t) => t.date !== null).slice(0, 5);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Finance"
        subtitle="Where your money is and where it goes."
        icon={<Wallet className="h-6 w-6" />}
      />

      {isLoading ? (
        <OverviewSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Net balance"
              value={netBalance}
              icon={Landmark}
              sub={`Across ${(accounts ?? []).length} account${(accounts ?? []).length === 1 ? "" : "s"}`}
              delay={0}
            />
            <StatCard
              label={`Spent in ${monthLabel(currentMonth, "long").split(" ")[0]}`}
              value={thisMonth?.spend ?? 0}
              icon={TrendingDown}
              sub="Transfers excluded"
              delay={STAGGER_MS}
              tone="negative"
            />
            <StatCard
              label={`Income in ${monthLabel(currentMonth, "long").split(" ")[0]}`}
              value={thisMonth?.income ?? 0}
              icon={TrendingUp}
              sub="Transfers excluded"
              delay={STAGGER_MS * 2}
              tone="positive"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <motion.div {...sectionMotion(3)} className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Income vs spend, last 6 months
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={flowConfig} className="h-64 w-full">
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
                      <Bar
                        dataKey="income"
                        fill="var(--color-income)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="spend"
                        fill="var(--color-spend)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...sectionMotion(4)} className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {monthLabel(currentMonth, "long")} by category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {breakdown.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No spending recorded this month yet.
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <CategoryDonut
                        breakdown={breakdown}
                        total={monthSpendTotal}
                        className="w-full"
                      />
                      <ul className="w-full space-y-1.5">
                        {breakdown.slice(0, 5).map((entry) => (
                          <li
                            key={entry.category}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    CATEGORY_META[entry.category].color,
                                }}
                              />
                              {CATEGORY_META[entry.category].label}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatMoney(entry.total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...sectionMotion(5)}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Recent transactions</CardTitle>
                <Link
                  href="/finance/accounts"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  All transactions
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-1">
                {recent.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm" title={transaction.description}>
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.date ? formatDate(transaction.date) : null}
                      </p>
                    </div>
                    <CategoryPicker transaction={transaction} />
                    <span
                      className={cn(
                        "w-24 shrink-0 text-right text-sm font-semibold tabular-nums",
                        transaction.amount > 0 &&
                          "text-green-600 dark:text-green-500"
                      )}
                    >
                      {formatMoney(transaction.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            {...sectionMotion(6)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/60"
              >
                <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                {label}
              </Link>
            ))}
          </motion.div>
        </>
      )}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
