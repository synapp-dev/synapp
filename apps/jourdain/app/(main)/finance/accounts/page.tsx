"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { differenceInDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Landmark,
  Upload,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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
  type BankTransaction,
} from "@/hooks/bank/use-bank";

function formatMoney(
  amount: number | null | undefined,
  currency: string | null
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-AU", {
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

// Compact relative time for the card badge, e.g. "1d", "3h", "5mo".
function shortAgo(iso: string | null): string {
  if (!iso) return "—";
  let date: Date;
  try {
    date = parseISO(iso);
  } catch {
    return "—";
  }
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(day / 365)}y`;
}

const COUNTUP_MS = 1100;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Animates a value 0 → target over durationMs, optionally after delayMs. */
function useCountUp(
  target: number,
  durationMs = COUNTUP_MS,
  delayMs = 0
): number {
  const [val, setVal] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    startRef.current = 0;
    setVal(0);
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      setVal(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delayMs]);

  return val;
}

const STREAM_CHARS_PER_TICK = 2;
const STREAM_TICK_MS = 18;

/** Reveals `fullText` character-by-character (after delayMs), returning the
 *  number of visible characters. Honours prefers-reduced-motion. */
function useStreamingText(
  fullText: string,
  runKey: string,
  delayMs = 0
): number {
  const [visibleLen, setVisibleLen] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setVisibleLen(fullText.length);
      return;
    }

    setVisibleLen(0);
    let n = 0;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        n = Math.min(fullText.length, n + STREAM_CHARS_PER_TICK);
        setVisibleLen(n);
        if (n >= fullText.length) window.clearInterval(interval);
      }, STREAM_TICK_MS);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [fullText, runKey, delayMs]);

  return visibleLen;
}

function FreshnessBadge({ accounts }: { accounts: BankAccount[] }) {
  if (accounts.length === 0) return null;

  const stale = accounts.filter((account) => isStale(account.updatedAt));

  if (stale.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/30 bg-green-600/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        All accounts up to date
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      {stale.length} account{stale.length === 1 ? "" : "s"} need refreshing
    </span>
  );
}

export default function FinanceAccountsPage() {
  const { data: accounts, isLoading, isFetching } = useBankAccounts();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = [...(accounts ?? []), DEMO_ACCOUNT];
  const selected = list.find((account) => account.externalId === selectedId) ?? null;

  // Clicking a card opens the master-detail view; clicking the open card again
  // collapses back to the grid.
  function toggle(externalId: string) {
    setSelectedId((prev) => (prev === externalId ? null : externalId));
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Landmark className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          {isFetching ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <FreshnessBadge accounts={list} />
          <ImportDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <LayoutGroup>
          <motion.div
            layout
            className="flex flex-col gap-4 lg:flex-row lg:items-start"
          >
            <motion.div
              layout
              className={cn(
                selected
                  ? "flex shrink-0 flex-col gap-3 lg:w-[280px]"
                  : "grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              )}
            >
              {list.map((account, index) => {
                // Every card (demo included) enters on the same beat, so the
                // sequence reads 1·2·3·4 with no extra pause before the last.
                const enterDelay = index * CARD_STAGGER_MS;
                return (
                  <AccountCard
                    key={account.externalId}
                    account={account}
                    selected={selected?.externalId === account.externalId}
                    compact={selected !== null}
                    enterDelay={enterDelay}
                    onSelect={() => toggle(account.externalId)}
                  />
                );
              })}
            </motion.div>

            <AnimatePresence mode="popLayout">
              {selected ? (
                <motion.div
                  key="panel"
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="min-w-0 flex-1"
                >
                  <div className="lg:sticky lg:top-20">
                    <TransactionsPanel account={selected} />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}
    </section>
  );
}

type CardVariant = "gold" | "graphite" | "white";
type CardNetwork = "mastercard" | "visa";

// Embossed quilted / diamond-stitch texture for the white card.
const QUILT_PATTERN: CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 28px)",
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.85) 1px 2px, transparent 2px 29px)",
    "repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 28px)",
    "repeating-linear-gradient(-45deg, rgba(255,255,255,0.85) 1px 2px, transparent 2px 29px)",
  ].join(", "),
};

const VARIANTS: Record<
  CardVariant,
  {
    surface: string;
    highlight: string;
    muted: string;
    stale: string;
    eye: string;
    pattern?: CSSProperties;
  }
> = {
  gold: {
    surface:
      "bg-gradient-to-br from-[#FFE981] via-[#FFC700] to-[#F59E0B] text-neutral-900 ring-black/5",
    highlight:
      "bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.85),transparent_55%)]",
    muted: "text-neutral-900/60",
    stale: "text-amber-900",
    eye: "bg-black/10 hover:bg-black/[0.16]",
  },
  graphite: {
    surface:
      "bg-gradient-to-br from-[#8a8d93] via-[#46484d] to-[#1b1c1f] text-white ring-white/10",
    highlight:
      "bg-[linear-gradient(120deg,transparent_22%,rgba(255,255,255,0.16)_46%,transparent_60%)]",
    muted: "text-white/60",
    stale: "text-amber-300",
    eye: "bg-white/15 hover:bg-white/25",
  },
  white: {
    surface:
      "bg-gradient-to-br from-[#f7f8fa] via-[#ffffff] to-[#dfe2e8] text-neutral-800 ring-black/10",
    highlight:
      "bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.95),transparent_60%)]",
    muted: "text-neutral-800/55",
    stale: "text-amber-700",
    eye: "bg-black/5 hover:bg-black/10",
    pattern: QUILT_PATTERN,
  },
};

const NETWORKS: Record<
  CardNetwork,
  { src: string; width: number; height: number; alt: string }
> = {
  mastercard: {
    src: "/icons/mastercard-logo.svg",
    width: 38,
    height: 30,
    alt: "Mastercard",
  },
  visa: { src: "/icons/visa-logo-gold.svg", width: 54, height: 18, alt: "Visa" },
};

// The bank feed carries no card brand, so map each account to its real card
// look by account number. Unknown accounts fall back to a graphite Visa.
const ACCOUNT_CARDS: Record<
  string,
  { variant: CardVariant; network: CardNetwork; number?: string }
> = {
  "16987096": { variant: "gold", network: "mastercard" },
  "22986353": { variant: "graphite", network: "visa" },
  "22986388": { variant: "graphite", network: "visa" },
  "demo-0000": {
    variant: "white",
    network: "mastercard",
    number: "5353 1600 4892 7452",
  },
};
const DEFAULT_CARD: {
  variant: CardVariant;
  network: CardNetwork;
  number?: string;
} = { variant: "graphite", network: "visa" };

// Illustrative card showing the white quilted style.
const DEMO_ACCOUNT: BankAccount = {
  externalId: "demo-0000",
  name: "Smart Access ••0000",
  accountType: "TRANSACTION",
  bsb: "062000",
  currency: "AUD",
  balance: 57452.48,
  balanceDate: null,
  updatedAt: "2026-06-16T06:00:00.000Z",
};

const CARD_STAGGER_MS = 100; // delay between successive cards entering

// Hidden state shows just a short prefix + the last 4 digits, e.g. "•• 6353".
function maskNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return `•• ${digits.slice(-4)}`;
}

function CardSkeleton() {
  return (
    <div className="aspect-[1.6/1] w-full overflow-hidden rounded-3xl border bg-muted/40 p-5">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted-foreground/15" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/15" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-4 w-12 animate-pulse rounded-full bg-muted-foreground/15" />
        </div>
      </div>
    </div>
  );
}

function AccountCard({
  account,
  selected,
  compact,
  enterDelay,
  onSelect,
}: {
  account: BankAccount;
  selected: boolean;
  compact: boolean;
  enterDelay: number;
  onSelect: () => void;
}) {
  const [hidden, setHidden] = useState(true);
  const stale = isStale(account.updatedAt);

  const config = ACCOUNT_CARDS[account.externalId] ?? DEFAULT_CARD;
  const variant = VARIANTS[config.variant];
  const network = NETWORKS[config.network];

  const animatedBalance = useCountUp(account.balance ?? 0, COUNTUP_MS, enterDelay);
  const fullNumber =
    config.number ??
    (account.bsb ? `${account.bsb} ${account.externalId}` : account.externalId);
  const numberLabel = hidden ? maskNumber(fullNumber) : fullNumber;
  const balanceLabel =
    account.balance == null
      ? "—"
      : formatMoney(animatedBalance, account.currency);

  const netScale = compact ? 0.82 : 1;
  const eyeIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      // In master-detail mode, dim the other cards so the active one stands out.
      // Opacity is driven here (not via a class) because Framer writes an inline
      // style that would otherwise override a Tailwind opacity utility.
      animate={{ opacity: compact && !selected ? 0.2 : 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: enterDelay / 1000,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.3 },
        layout: { type: "spring", stiffness: 320, damping: 34 },
      }}
      // Restore full opacity on hover so dimmed cards stay easy to switch to.
      whileHover={{ y: -2, opacity: 1 }}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group relative w-full text-left outline-none"
    >
      <div
        className={cn(
          "relative aspect-[1.6/1] overflow-hidden rounded-3xl shadow-lg ring-1",
          compact ? "p-4" : "p-5",
          variant.surface,
          selected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
            : "group-focus-visible:ring-2 group-focus-visible:ring-primary"
        )}
      >
        {/* quilted texture (white card) */}
        {variant.pattern ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={variant.pattern}
          />
        ) : null}
        {/* glossy highlight */}
        <div
          className={cn("pointer-events-none absolute inset-0", variant.highlight)}
        />

        <div className="relative flex h-full flex-col justify-between [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between gap-2">
            <Image
              src="/icons/commbank-logo.svg"
              alt="CommBank"
              width={34}
              height={34}
              unoptimized
              className={cn("drop-shadow-sm", compact ? "h-7 w-7" : "h-9 w-9")}
            />
            <div className={cn("flex items-center", compact ? "gap-2" : "gap-2.5")}>
              <span
                role="button"
                tabIndex={0}
                aria-label={hidden ? "Show card number" : "Hide card number"}
                onClick={(event) => {
                  event.stopPropagation();
                  setHidden((value) => !value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setHidden((value) => !value);
                  }
                }}
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors",
                  compact ? "p-1" : "p-1.5",
                  variant.eye
                )}
              >
                {hidden ? (
                  <Eye className={eyeIcon} />
                ) : (
                  <EyeOff className={eyeIcon} />
                )}
              </span>
              <span
                className={cn(
                  "font-mono font-medium tracking-wider tabular-nums",
                  compact ? "text-xs" : "text-base"
                )}
              >
                {numberLabel}
              </span>
              <Image
                src={network.src}
                alt={network.alt}
                width={Math.round(network.width * netScale)}
                height={Math.round(network.height * netScale)}
                unoptimized
                className="drop-shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 leading-none">
              <span
                className={cn(
                  "font-semibold tracking-tight tabular-nums",
                  compact ? "text-2xl" : "text-3xl"
                )}
              >
                {balanceLabel}
              </span>
              {account.currency ? (
                <span
                  className={cn(
                    "flex items-center gap-2.5 font-normal",
                    compact ? "text-xs" : "text-sm",
                    variant.muted
                  )}
                >
                  <span>·</span>
                  {account.currency}
                </span>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                variant.eye,
                stale ? variant.stale : variant.muted
              )}
            >
              <Clock className="h-3 w-3" />
              <span suppressHydrationWarning>{shortAgo(account.updatedAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function ImportDialog() {
  const importOfx = useImportOfx();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          importOfx.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import transactions</DialogTitle>
          <DialogDescription>
            Export an <code>.ofx</code> file from CommBank NetBank and drop it
            below. Re-importing is safe — duplicates are skipped.
          </DialogDescription>
        </DialogHeader>

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
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
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
            or click to choose a file
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
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="h-3 w-3" />
            Importing…
          </p>
        ) : null}
        {importOfx.error ? (
          <p className="text-sm text-destructive">{importOfx.error.message}</p>
        ) : null}
        {result && !importOfx.isPending ? (
          <p className="text-sm text-muted-foreground">{result}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const TX_PAGE_SIZE = 25;
const ROW_STAGGER_MS = 190; // delay between successive rows entering (one after another)
const ROW_SLIDE_MS = 500; // slide-down + fade-in duration per row
const AMOUNT_FADE_MS = 2200; // slow slide-down + fade-in for the amount
const AMOUNT_COUNTUP_MS = 3200; // amount count-up duration (paces with the fade)

function TransactionRow({
  transaction,
  currency,
  index,
}: {
  transaction: BankTransaction;
  currency: string | null;
  index: number;
}) {
  const delay = index * ROW_STAGGER_MS;
  // Stream the description in as the row slides into place.
  const streamLen = useStreamingText(
    transaction.description,
    transaction.id,
    delay
  );
  const streamComplete = streamLen >= transaction.description.length;
  // Then count the amount up, starting once the description has finished.
  const streamMs =
    Math.ceil(transaction.description.length / STREAM_CHARS_PER_TICK) *
    STREAM_TICK_MS;
  const amount = useCountUp(
    transaction.amount,
    AMOUNT_COUNTUP_MS,
    delay + streamMs
  );

  return (
    <TableRow
      className="animate-in fade-in slide-in-from-top-2 fill-mode-both"
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${ROW_SLIDE_MS}ms`,
      }}
    >
      <TableCell className="w-28 whitespace-nowrap py-4 pl-4 align-top text-sm text-muted-foreground">
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell className="py-4 align-top">
        <span
          className="block truncate text-sm"
          title={transaction.description}
        >
          {transaction.description.slice(0, streamLen)}
          {!streamComplete ? (
            <span
              className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-current/60 align-middle"
              aria-hidden
            />
          ) : null}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "w-36 whitespace-nowrap py-4 pr-4 text-right align-top text-base font-semibold tabular-nums",
          transaction.amount < 0
            ? "text-foreground"
            : "text-green-600 dark:text-green-500"
        )}
      >
        {/* Reserve the cell's (taller) height and width up front with an
            invisible placeholder so the row never grows; once the description
            finishes, slide the counting amount down and fade it in slowly. */}
        {streamComplete ? (
          <span
            className="inline-block animate-in fade-in slide-in-from-top-2 fill-mode-both"
            style={{ animationDuration: `${AMOUNT_FADE_MS}ms` }}
          >
            {formatMoney(amount, currency)}
          </span>
        ) : (
          <span className="invisible">
            {formatMoney(transaction.amount, currency)}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function TransactionsPanel({ account }: { account: BankAccount | null }) {
  const {
    data: transactions,
    isFetching,
    error,
  } = useBankTransactions(account?.externalId ?? null);

  const [page, setPage] = useState(0);
  // Reset to the first page whenever the selected account changes.
  useEffect(() => {
    setPage(0);
  }, [account?.externalId]);

  const all = transactions ?? [];
  const pageCount = Math.max(1, Math.ceil(all.length / TX_PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * TX_PAGE_SIZE;
  const visible = all.slice(start, start + TX_PAGE_SIZE);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">
            {account?.name ?? "Account"}
          </h2>
          {account && accountSubtitle(account) ? (
            <p className="truncate text-xs text-muted-foreground">
              {accountSubtitle(account)}
            </p>
          ) : null}
        </div>
        {account ? (
          <p className="shrink-0 text-base font-semibold tabular-nums">
            {formatMoney(account.balance, account.currency)}
          </p>
        ) : null}
      </div>

      {isFetching && !transactions ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="px-4 py-3 text-sm text-destructive">{error.message}</p>
      ) : all.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
          No transactions for this account yet.
        </p>
      ) : (
        <>
          <ScrollArea className="min-h-0 flex-1">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28 pl-4">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36 pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={`${account?.externalId ?? ""}-${current}`}>
                {visible.map((transaction, index) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={account?.currency ?? null}
                    index={index}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {start + 1}–{Math.min(start + TX_PAGE_SIZE, all.length)} of{" "}
              {all.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="tabular-nums">
                Page {current + 1} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
