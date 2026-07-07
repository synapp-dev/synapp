"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { categoryBreakdown, monthKey, monthLabel } from "@/lib/finance/stats";
import type { Category } from "@/lib/finance/categorise";
import {
  useBudgets,
  useDeleteBudget,
  useFinanceTransactions,
  useUpsertBudget,
  type Budget,
} from "@/hooks/finance/use-finance";
import {
  BUDGETABLE_CATEGORIES,
  CATEGORY_META,
} from "@/components/finance/category-meta";
import { FinanceEmpty } from "@/components/finance/finance-empty";

function isCategory(value: string): value is Category {
  return value in CATEGORY_META;
}

function BudgetDialog({
  existing,
  taken,
  trigger,
}: {
  existing?: Budget;
  taken: string[];
  trigger: React.ReactNode;
}) {
  const upsert = useUpsertBudget();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | "">(
    existing && isCategory(existing.category) ? existing.category : ""
  );
  const [limit, setLimit] = useState(
    existing ? String(existing.monthlyLimit) : ""
  );

  const options = BUDGETABLE_CATEGORIES.filter(
    (option) => option === existing?.category || !taken.includes(option)
  );

  function submit() {
    const monthlyLimit = Number(limit);
    if (!category || !Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      toast.error("Pick a category and a positive monthly limit.");
      return;
    }
    upsert.mutate(
      { category, monthlyLimit },
      {
        onSuccess: () => {
          setOpen(false);
          if (!existing) {
            setCategory("");
            setLimit("");
          }
          toast.success(
            `Budget ${existing ? "updated" : "set"} for ${CATEGORY_META[category].label}`
          );
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                if (isCategory(value)) setCategory(value);
              }}
              disabled={Boolean(existing)}
            >
              <SelectTrigger id="budget-category" className="w-full">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => {
                  const meta = CATEGORY_META[option];
                  return (
                    <SelectItem key={option} value={option}>
                      <span className="flex items-center gap-2">
                        <meta.icon
                          className="h-4 w-4"
                          style={{ color: meta.color }}
                        />
                        {meta.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-limit">Monthly limit</Label>
            <Input
              id="budget-limit"
              type="number"
              min="1"
              step="10"
              inputMode="decimal"
              placeholder="500"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? <Spinner className="h-4 w-4" /> : null}
            {existing ? "Save" : "Add budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BudgetRow({
  budget,
  actual,
  taken,
  index,
}: {
  budget: Budget;
  actual: number;
  taken: string[];
  index: number;
}) {
  const deleteBudget = useDeleteBudget();
  const meta = isCategory(budget.category)
    ? CATEGORY_META[budget.category]
    : CATEGORY_META.other;
  const ratio = budget.monthlyLimit > 0 ? actual / budget.monthlyLimit : 0;
  const over = ratio > 1;
  const near = !over && ratio >= 0.85;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Card className={cn(over && "border-red-500/50")}>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2.5">
            <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {meta.label}
            </span>
            {over ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Over by {formatMoney(actual - budget.monthlyLimit)}
              </span>
            ) : near ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Close to limit
              </span>
            ) : null}
            <BudgetDialog
              existing={budget}
              taken={taken}
              trigger={
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  Edit
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${meta.label} budget`}
              disabled={deleteBudget.isPending}
              onClick={() =>
                deleteBudget.mutate(budget.id, {
                  onSuccess: () => toast.success(`${meta.label} budget removed`),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Progress
            value={Math.min(100, ratio * 100)}
            className={cn(
              "h-2",
              over
                ? "[&>[data-slot=progress-indicator]]:bg-red-500"
                : near
                  ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
                  : ""
            )}
          />
          <p className="text-xs text-muted-foreground">
            <span
              className={cn(
                "font-medium tabular-nums",
                over ? "text-red-600 dark:text-red-400" : "text-foreground"
              )}
            >
              {formatMoney(actual)}
            </span>{" "}
            of {formatMoney(budget.monthlyLimit)} ·{" "}
            {Math.round(ratio * 100)}% used
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function FinanceBudgetPage() {
  const { data: transactions, isLoading: txLoading } = useFinanceTransactions();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const isLoading = txLoading || budgetsLoading;

  const all = useMemo(() => transactions ?? [], [transactions]);
  const currentMonth = monthKey(new Date());
  const actuals = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of categoryBreakdown(all, currentMonth)) {
      map.set(entry.category, entry.total);
    }
    return map;
  }, [all, currentMonth]);

  const list = budgets ?? [];
  const taken = list.map((budget) => budget.category);
  const overCount = list.filter(
    (budget) => (actuals.get(budget.category) ?? 0) > budget.monthlyLimit
  ).length;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Budget"
        subtitle={`Monthly limits versus ${monthLabel(currentMonth, "long")} actuals.`}
        icon={<PiggyBank className="h-6 w-6" />}
        actions={
          !isLoading ? (
            <div className="flex items-center gap-3">
              {overCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overCount} over budget
                </span>
              ) : null}
              <BudgetDialog
                taken={taken}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    New budget
                  </Button>
                }
              />
            </div>
          ) : undefined
        }
      />

      {isLoading ? (
        <BudgetSkeleton />
      ) : all.length === 0 ? (
        <FinanceEmpty message="Import a bank statement first, then set monthly limits per category." />
      ) : list.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <PiggyBank className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No budgets yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Set a monthly limit per category and track how this month is
              going against it.
            </p>
          </div>
          <BudgetDialog
            taken={taken}
            trigger={
              <Button size="sm" className="mt-1">
                <Plus className="h-4 w-4" />
                Create your first budget
              </Button>
            }
          />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((budget, index) => (
            <BudgetRow
              key={budget.id}
              budget={budget}
              actual={actuals.get(budget.category) ?? 0}
              taken={taken}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BudgetSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
