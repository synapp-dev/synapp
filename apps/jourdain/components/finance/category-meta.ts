import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  Car,
  CircleDollarSign,
  Clapperboard,
  CreditCard,
  HeartPulse,
  Landmark,
  Plug,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import type { Category } from "@/lib/finance/categorise";

export type CategoryMeta = {
  label: string;
  icon: LucideIcon;
  /** Hex colour used for chart fills and dots. */
  color: string;
};

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  groceries: { label: "Groceries", icon: ShoppingCart, color: "#22c55e" },
  dining: { label: "Dining", icon: UtensilsCrossed, color: "#f97316" },
  transport: { label: "Transport", icon: Car, color: "#3b82f6" },
  shopping: { label: "Shopping", icon: ShoppingBag, color: "#ec4899" },
  utilities: { label: "Utilities", icon: Plug, color: "#eab308" },
  subscriptions: { label: "Subscriptions", icon: RefreshCcw, color: "#8b5cf6" },
  entertainment: { label: "Entertainment", icon: Clapperboard, color: "#06b6d4" },
  health: { label: "Health", icon: HeartPulse, color: "#ef4444" },
  fees: { label: "Fees", icon: Receipt, color: "#94a3b8" },
  debt: { label: "Debt", icon: CreditCard, color: "#b91c1c" },
  taxes: { label: "Taxes", icon: Landmark, color: "#a16207" },
  income: { label: "Income", icon: Banknote, color: "#16a34a" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, color: "#64748b" },
  other: { label: "Other", icon: CircleDollarSign, color: "#78716c" },
};

/** Categories that make sense to budget against (spend categories). */
export const BUDGETABLE_CATEGORIES: Category[] = [
  "groceries",
  "dining",
  "transport",
  "shopping",
  "utilities",
  "subscriptions",
  "entertainment",
  "health",
  "fees",
  "debt",
  "taxes",
  "other",
];
