"use client";

import { useRef, useState } from "react";
import {
  differenceInDays,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { AlertTriangle, CheckCircle2, Landmark, Upload } from "lucide-react";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import {
  useBankAccounts,
  useBankTransactions,
  useImportOfx,
  type BankAccount,
} from "@/hooks/bank/use-bank";

function formatMoney(
  amount: number | null | undefined,
  currency: string | null
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "AUD",
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

function accountSubtitle(account: BankAccount): string | null {
  if (account.bsb) return `${account.bsb} ${account.externalId}`;
  return account.externalId;
}

const STALE_DAYS = 7;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  try {
    return differenceInDays(new Date(), parseISO(iso));
  } catch {
    return null;
  }
}

function isStale(iso: string | null): boolean {
  const days = daysSince(iso);
  return days != null && days >= STALE_DAYS;
}

function updatedLabel(iso: string | null): string {
  if (!iso) return "Never imported";
  try {
    return `Updated ${formatDistanceToNow(parseISO(iso), { addSuffix: true })}`;
  } catch {
    return "Updated recently";
  }
}

function FreshnessBanner({ accounts }: { accounts: BankAccount[] }) {
  if (accounts.length === 0) return null;

  const stale = accounts.filter((account) => isStale(account.updatedAt));
  if (stale.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
        All accounts up to date.
      </p>
    );
  }

  const oldest = stale.reduce((a, b) =>
    (daysSince(a.updatedAt) ?? 0) >= (daysSince(b.updatedAt) ?? 0) ? a : b
  );

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {stale.length} account{stale.length === 1 ? "" : "s"} need refreshing
        </p>
        <p className="text-xs text-muted-foreground">
          Oldest {updatedLabel(oldest.updatedAt).toLowerCase()}. Export a fresh
          file from NetBank and drop it below.
        </p>
      </div>
    </div>
  );
}

export default function FinanceAccountsPage() {
  const { data: accounts, isFetching } = useBankAccounts();
  const [selected, setSelected] = useState<BankAccount | null>(null);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      <FreshnessBanner accounts={accounts ?? []} />

      <ImportCard />

      {(accounts ?? []).length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(accounts ?? []).map((account) => (
            <button
              key={account.externalId}
              type="button"
              className="text-left"
              onClick={() => setSelected(account)}
            >
              <Card className="h-full transition-colors hover:border-border">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Landmark className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {account.name}
                      </p>
                      {accountSubtitle(account) ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {accountSubtitle(account)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">
                      {formatMoney(account.balance, account.currency)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {account.currency ?? ""}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      isStale(account.updatedAt)
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {updatedLabel(account.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : !isFetching ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Import a CommBank <code>.ofx</code> export above to
          see your balances and transactions.
        </p>
      ) : null}

      <TransactionsSheet
        account={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </section>
  );
}

function ImportCard() {
  const importOfx = useImportOfx();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setResult(null);
    const content = await file.text();
    importOfx.mutate(content, {
      onSuccess: (summary) => {
        const dupes =
          summary.duplicates > 0
            ? ` · ${summary.duplicates} duplicate${summary.duplicates === 1 ? "" : "s"} skipped`
            : "";
        setResult(
          `Imported ${summary.inserted} new transaction${summary.inserted === 1 ? "" : "s"} across ${summary.accounts} account${summary.accounts === 1 ? "" : "s"}${dupes}.`
        );
      },
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-border"
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a CommBank <code>.ofx</code> export here
          </p>
          <p className="text-xs text-muted-foreground">
            or click to choose a file — re-importing is safe (duplicates are
            skipped)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".ofx,application/x-ofx,application/octet-stream"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>

        {importOfx.isPending ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="h-3 w-3" />
            Importing…
          </p>
        ) : null}
        {importOfx.error ? (
          <p className="mt-3 text-sm text-destructive">
            {importOfx.error.message}
          </p>
        ) : null}
        {result && !importOfx.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TransactionsSheet({
  account,
  onOpenChange,
}: {
  account: BankAccount | null;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    data: transactions,
    isFetching,
    error,
  } = useBankTransactions(account?.externalId ?? null);

  return (
    <Sheet open={account !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{account?.name ?? "Account"}</SheetTitle>
          <SheetDescription>
            {account
              ? `${formatMoney(account.balance, account.currency)} balance`
              : ""}
            {account && accountSubtitle(account)
              ? ` · ${accountSubtitle(account)}`
              : ""}
          </SheetDescription>
        </SheetHeader>

        {isFetching && !transactions ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <p className="px-4 text-sm text-destructive">{error.message}</p>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions ?? []).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap pl-4 align-top text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="text-sm">{transaction.description}</span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap pr-4 text-right align-top text-sm tabular-nums",
                        transaction.amount < 0
                          ? "text-foreground"
                          : "text-green-600 dark:text-green-500"
                      )}
                    >
                      {formatMoney(transaction.amount, account?.currency ?? null)}
                    </TableCell>
                  </TableRow>
                ))}
                {(transactions ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No transactions for this account yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
