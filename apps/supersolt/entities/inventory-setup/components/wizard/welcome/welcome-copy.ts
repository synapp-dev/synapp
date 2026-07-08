import {
  Boxes,
  Building2,
  Carrot,
  ClipboardList,
  ReceiptText,
  Sandwich,
  ScanBarcode,
  TrendingDown,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/**
 * Scripted, one-time superbot welcome shown the first time a venue opens the
 * Inventory Setup wizard (gated on `wizard.welcomeSeen` + no progress yet).
 *
 * Pure copy/config only — choreography lives in inventory-setup-welcome.tsx.
 * See apps/supersolt/docs/features/inventory-setup/setup-wizard/plan.md.
 */

export type WelcomeStageBox = {
  id: "suppliers" | "inventory" | "products" | "storage";
  label: string;
  icon: LucideIcon;
  summary: string;
};

/** The four pillars of inventory setup, shown as a 2x2 grid in the overview. */
export const WELCOME_STAGE_BOXES: readonly WelcomeStageBox[] = [
  {
    id: "suppliers",
    label: "Suppliers",
    icon: Building2,
    summary: "Who you buy from and the items they sell.",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Boxes,
    summary: "Supplier items turned into trackable ingredients.",
  },
  {
    id: "products",
    label: "Products",
    icon: ScanBarcode,
    summary: "Your menu items, each with a costed recipe.",
  },
  {
    id: "storage",
    label: "Storage",
    icon: Warehouse,
    summary: "Where your stock actually lives for counts.",
  },
];

export type TracebackStep = {
  label: string;
  icon: LucideIcon;
};

/**
 * Listed in reveal order (sandwich first). Rendered bottom-to-top in a single
 * column so the sold sandwich sits at the bottom and traces back — through the
 * ingredients it uses and the stock running low — to the supplier you ordered
 * them from, at the top, with arrows pointing up.
 */
export const SUPPLIER_TRACEBACK: readonly TracebackStep[] = [
  { label: "Client buys a sandwich", icon: Sandwich },
  { label: "Ingredients get used", icon: Carrot },
  { label: "Stock gets low", icon: TrendingDown },
  { label: "Order from supplier", icon: Building2 },
];

export type SupplierBenefit = {
  label: string;
  icon: LucideIcon;
};

/** What the bot can do once suppliers + their items are in. */
export const SUPPLIER_BENEFITS: readonly SupplierBenefit[] = [
  { label: "Track price changes", icon: TrendingUp },
  { label: "Build order guides", icon: ClipboardList },
  { label: "Match invoices automatically", icon: ReceiptText },
];

/**
 * Builds the per-step narration. The greeting interpolates the user's first
 * name; everything else is static. Streaming text (step "supplierWhy") reuses
 * the app-wide typewriter so it matches the agent chat voice.
 */
export function buildWelcomeScript(firstName: string | null) {
  const trimmed = firstName?.trim();
  const name = trimmed ? trimmed : "there";
  return {
    greeting: trimmed ? `Hey there ${trimmed}!` : "Hey there!",
    greetingBody:
      "Once you give me a few details, I can cost every dish to the cent, track stock as it moves, flag waste before it adds up, and keep your ordering tight — so the numbers across the rest of Supersolt stay accurate.",
    overview:
      "I'm excited to help you run your restaurant. I just need a few things from you first, so I can do my job perfectly.",
    supplierIntroLead: "Let's start with suppliers.",
    supplierIntroSub: "Suppliers are the foundation of everything.",
    supplierWhy:
      "Every ingredient, price and order traces back to who you buy it from — so getting this right makes everything downstream accurate.",
    supplierBenefit:
      "Once your suppliers and items are in, I can track price changes, build order guides, and match incoming invoices automatically.",
  } as const;
}
