import {
  Boxes,
  Building2,
  Carrot,
  ClipboardList,
  ReceiptText,
  Sandwich,
  ScanBarcode,
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
};

/** The four pillars of inventory setup, shown as a grid then collapsed. */
export const WELCOME_STAGE_BOXES: readonly WelcomeStageBox[] = [
  { id: "suppliers", label: "Suppliers", icon: Building2 },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "products", label: "Products", icon: ScanBarcode },
  { id: "storage", label: "Storage", icon: Warehouse },
];

export type TracebackStep = {
  label: string;
  icon: LucideIcon;
};

/**
 * Listed in reveal order (sandwich first). Rendered right-to-left so the sold
 * sandwich sits on the right and traces back — through the ingredients it uses
 * — to the supplier you ordered them from, with arrows pointing left.
 */
export const SUPPLIER_TRACEBACK: readonly TracebackStep[] = [
  { label: "Client buys a sandwich", icon: Sandwich },
  { label: "Ingredients get used", icon: Carrot },
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
  const name = firstName?.trim() ? firstName.trim() : "there";
  return {
    greeting: `Welcome to the inventory setup, ${name}!`,
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
