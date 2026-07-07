import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Category } from "@/lib/finance/categorise";

export type FinanceTransaction = {
  id: string;
  accountExternalId: string;
  date: string | null;
  amount: number;
  type: string | null;
  description: string;
  category: Category;
};

export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, style: "short" | "long" = "short"): string {
  try {
    return format(parseISO(`${key}-01`), style === "short" ? "MMM" : "MMMM yyyy");
  } catch {
    return key;
  }
}

export function shiftMonth(key: string, delta: number): string {
  return monthKey(addMonths(parseISO(`${key}-01`), delta));
}

export function isTransfer(t: FinanceTransaction): boolean {
  return t.category === "transfer";
}

/** Spend = negative, non-transfer. Amounts returned as positive dollars. */
export function isSpend(t: FinanceTransaction): boolean {
  return t.amount < 0 && !isTransfer(t);
}

/** Income = positive, non-transfer. */
export function isIncome(t: FinanceTransaction): boolean {
  return t.amount > 0 && !isTransfer(t);
}

export function inMonth(t: FinanceTransaction, key: string): boolean {
  return t.date !== null && monthKeyOf(t.date) === key;
}

export type MonthlyFlow = {
  month: string;
  label: string;
  income: number;
  spend: number;
  net: number;
};

/** Trailing monthly income/spend/net series ending at the current month. */
export function monthlySeries(
  transactions: FinanceTransaction[],
  months: number,
  now = new Date()
): MonthlyFlow[] {
  const current = monthKey(now);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) keys.push(shiftMonth(current, -i));

  const byMonth = new Map<string, { income: number; spend: number }>(
    keys.map((key) => [key, { income: 0, spend: 0 }])
  );
  for (const t of transactions) {
    if (!t.date || isTransfer(t)) continue;
    const bucket = byMonth.get(monthKeyOf(t.date));
    if (!bucket) continue;
    if (t.amount > 0) bucket.income += t.amount;
    else bucket.spend += -t.amount;
  }

  return keys.map((key) => {
    const bucket = byMonth.get(key) ?? { income: 0, spend: 0 };
    return {
      month: key,
      label: monthLabel(key),
      income: round2(bucket.income),
      spend: round2(bucket.spend),
      net: round2(bucket.income - bucket.spend),
    };
  });
}

export type CategoryTotal = { category: Category; total: number; count: number };

/** Spend per category for one month, largest first. */
export function categoryBreakdown(
  transactions: FinanceTransaction[],
  key: string
): CategoryTotal[] {
  const totals = new Map<Category, { total: number; count: number }>();
  for (const t of transactions) {
    if (!isSpend(t) || !inMonth(t, key)) continue;
    const entry = totals.get(t.category) ?? { total: 0, count: 0 };
    entry.total += -t.amount;
    entry.count += 1;
    totals.set(t.category, entry);
  }
  return [...totals.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total: round2(total),
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

/** A short, stable merchant label derived from a raw bank description. */
export function merchantName(description: string): string {
  let d = description.trim();
  d = d.replace(/^return\s+(\d{2}\/\d{2}\/\d{2}\s+)?/i, "");
  d = d.replace(/^direct (debit|credit)\s+\d+\s+/i, "");
  d = d.replace(/^(fast\s+)?transfer\s+(to|from)\s+/i, "");
  d = d.replace(/^(paypal|sq|xsolla|payprc?o?)\s*[*/]\s*/i, "");
  const cardCut = d.search(/\s+card\s+xx\d+/i);
  if (cardCut > 0) d = d.slice(0, cardCut);
  const valueCut = d.search(/\s+value date:/i);
  if (valueCut > 0) d = d.slice(0, valueCut);
  d = d.replace(/\b\d{6,}\b/g, "").replace(/\s{2,}/g, " ").trim();

  const words = d.split(/\s+/).slice(0, 3).join(" ");
  const cleaned = words.replace(/[*_]+$/g, "").trim();
  return titleCase(cleaned || d || description);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export type MerchantTotal = {
  merchant: string;
  total: number;
  count: number;
  category: Category;
};

export function topMerchants(
  transactions: FinanceTransaction[],
  key: string,
  limit = 8
): MerchantTotal[] {
  const totals = new Map<string, MerchantTotal>();
  for (const t of transactions) {
    if (!isSpend(t) || !inMonth(t, key)) continue;
    const merchant = merchantName(t.description);
    const entry =
      totals.get(merchant) ??
      ({ merchant, total: 0, count: 0, category: t.category } as MerchantTotal);
    entry.total += -t.amount;
    entry.count += 1;
    totals.set(merchant, entry);
  }
  return [...totals.values()]
    .map((entry) => ({ ...entry, total: round2(entry.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export type IncomeSource = {
  source: string;
  total: number;
  count: number;
  lastDate: string | null;
  transactions: FinanceTransaction[];
};

export function incomeBySource(
  transactions: FinanceTransaction[]
): IncomeSource[] {
  const sources = new Map<string, IncomeSource>();
  for (const t of transactions) {
    if (!isIncome(t)) continue;
    const source = merchantName(t.description);
    const entry =
      sources.get(source) ??
      ({ source, total: 0, count: 0, lastDate: null, transactions: [] } as IncomeSource);
    entry.total += t.amount;
    entry.count += 1;
    entry.transactions.push(t);
    if (t.date && (!entry.lastDate || t.date > entry.lastDate)) {
      entry.lastDate = t.date;
    }
    sources.set(source, entry);
  }
  return [...sources.values()]
    .map((entry) => ({ ...entry, total: round2(entry.total) }))
    .sort((a, b) => b.total - a.total);
}

export type Cadence = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

export type RecurringPayment = {
  merchant: string;
  category: Category;
  cadence: Cadence;
  amount: number;
  annualised: number;
  lastCharged: string | null;
  charges: number;
};

const CADENCES: { cadence: Cadence; min: number; max: number; perYear: number }[] = [
  { cadence: "weekly", min: 5, max: 10, perYear: 52 },
  { cadence: "fortnightly", min: 11, max: 18, perYear: 26 },
  { cadence: "monthly", min: 24, max: 38, perYear: 12 },
  { cadence: "quarterly", min: 80, max: 100, perYear: 4 },
  { cadence: "yearly", min: 340, max: 390, perYear: 1 },
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

// Categories whose repeat purchases are shopping habits or noise, not
// subscriptions (Amazon orders, grocery runs, takeaway, bank fees).
const RECURRING_EXCLUDED: Category[] = [
  "transfer",
  "income",
  "groceries",
  "dining",
  "shopping",
  "fees",
];

/** Detect recurring payments: same merchant, similar amount, steady cadence. */
export function detectRecurring(
  transactions: FinanceTransaction[]
): RecurringPayment[] {
  const byMerchant = new Map<string, FinanceTransaction[]>();
  for (const t of transactions) {
    if (t.amount >= 0 || !t.date) continue;
    if (RECURRING_EXCLUDED.includes(t.category)) continue;
    const merchant = merchantName(t.description);
    const list = byMerchant.get(merchant) ?? [];
    list.push(t);
    byMerchant.set(merchant, list);
  }

  const results: RecurringPayment[] = [];
  for (const [merchant, list] of byMerchant) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => (a.date! < b.date! ? -1 : 1));

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = differenceInCalendarDays(
        parseISO(sorted[i]!.date!),
        parseISO(sorted[i - 1]!.date!)
      );
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length < 2) continue;

    const medianGap = median(gaps);
    const cadence = CADENCES.find(
      (c) => medianGap >= c.min && medianGap <= c.max
    );
    if (!cadence) continue;

    const amounts = sorted.map((t) => -t.amount);
    const medianAmount = median(amounts);
    if (medianAmount <= 0) continue;
    const similar = amounts.filter(
      (a) => Math.abs(a - medianAmount) / medianAmount <= 0.25
    );
    if (similar.length / amounts.length < 0.6) continue;

    const last = sorted[sorted.length - 1]!;
    results.push({
      merchant,
      category: last.category,
      cadence: cadence.cadence,
      amount: round2(medianAmount),
      annualised: round2(medianAmount * cadence.perYear),
      lastCharged: last.date,
      charges: sorted.length,
    });
  }

  return results.sort((a, b) => b.annualised - a.annualised);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
