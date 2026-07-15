import type {
  SalesOrderRow,
  SalesOrderSource,
} from "@/entities/sales-insights/model/types";

export function formatCurrency(cents: number): string {
  const abs = Math.abs(cents / 100);
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSquareMoney(
  m: { amount?: number; currency?: string } | undefined,
): string {
  if (!m || typeof m.amount !== "number") return "—";
  const cur = m.currency?.toUpperCase();
  if (cur && cur.length === 3) {
    try {
      return (m.amount / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 2,
      });
    } catch {
      /* invalid currency code */
    }
  }
  return formatCurrency(m.amount);
}

export function formatDayTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDetailDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    "dine-in": "Dine-in",
    takeaway: "Takeaway",
    delivery: "Delivery",
    online: "Online",
    pos: "POS",
  };
  return (
    map[channel] ?? `${channel.charAt(0).toUpperCase()}${channel.slice(1)}`
  );
}

export function paymentLabel(paymentMethod: string | null): string {
  if (!paymentMethod) {
    return "Unknown";
  }

  const map: Record<string, string> = {
    card: "Card",
    cash: "Cash",
    digital_wallet: "Digital Wallet",
    eftpos: "EFTPOS",
  };

  if (map[paymentMethod]) {
    return map[paymentMethod];
  }

  return (
    paymentMethod.charAt(0).toUpperCase() +
    paymentMethod.slice(1).replaceAll("_", " ")
  );
}

export function statusLabel(order: SalesOrderRow): "Void" | "Refund" | "Sale" {
  if (order.is_void) {
    return "Void";
  }
  if (order.is_refund) {
    return "Refund";
  }
  return "Sale";
}

export function sourceLabel(source: SalesOrderSource | undefined): string {
  if (source === "square") return "Square";
  if (source === "demo") return "Demo";
  return "Manual";
}
