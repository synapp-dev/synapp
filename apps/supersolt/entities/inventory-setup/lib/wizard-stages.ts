import {
  Boxes,
  Building2,
  ScanBarcode,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { InventorySetupWizardStageId } from "@/entities/inventory-setup/model/types";

/**
 * Static, versioned narration copy for the Inventory Setup Wizard. The server
 * owns structural completion/locking (see server/inventory-setup/wizard-model.ts);
 * this config only supplies the superbot voice per stage.
 *
 * See apps/supersolt/docs/features/inventory-setup/setup-wizard/plan.md §5/§6.
 */
export type WizardStageNarration = {
  id: InventorySetupWizardStageId;
  icon: LucideIcon;
  tagline: string;
  /** Mini welcome — spoken by the superbot when the stage opens. */
  welcome: string;
  /** Why this stage matters. */
  why: string;
  /** What the bot can do once this stage is done right. */
  benefit: string;
  /** Primary call-to-action label. */
  ctaLabel: string;
};

export const WIZARD_STAGE_NARRATION: Record<
  InventorySetupWizardStageId,
  WizardStageNarration
> = {
  suppliers: {
    id: "suppliers",
    icon: Building2,
    tagline: "Who you buy from",
    welcome:
      "Let's get your suppliers sorted first. I can talk to Xero to make this easier — I'll pull in your contacts and read your invoices so you don't have to type it all out.",
    why: "Suppliers are the foundation. Every ingredient, price and order traces back to who you buy it from, so getting this right makes everything downstream accurate.",
    benefit:
      "Once your suppliers and their items are in, I can track price changes, build order guides, and match incoming invoices automatically.",
    ctaLabel: "Get started with suppliers",
  },
  inventory: {
    id: "inventory",
    icon: Boxes,
    tagline: "What you can track",
    welcome:
      "Now let's turn those supplier items into ingredients I can actually count. I've suggested units and pack sizes from what I found — have a quick look and change anything I've missed.",
    why: "Raw invoice lines like “Box of Tomatoes — 10kg” aren't trackable on their own. Normalising them into ingredients (and batches you make in-house) is what lets me measure stock and cost.",
    benefit:
      "With trackable ingredients I can run stock counts, flag variance and waste, and cost every recipe to the cent.",
    ctaLabel: "Get started with inventory",
  },
  products: {
    id: "products",
    icon: ScanBarcode,
    tagline: "What you sell",
    welcome:
      "Time to bring in what you sell. I'll import your items and modifiers straight from Square — then we'll go through each one, check the modifiers, and add the recipe behind it.",
    why: "Linking each product to its recipe is how sales turn into ingredient usage. Without it, I can't tell what stock a busy service actually burned through.",
    benefit:
      "Once products are mapped I can forecast usage from sales, auto-deduct stock, and show you gross profit per item.",
    ctaLabel: "Get started with products",
  },
  storage: {
    id: "storage",
    icon: Warehouse,
    tagline: "Where you keep it",
    welcome:
      "Last step — tell me where you keep your stock. Fridges, dry store, the cellar… whatever makes sense for your counts.",
    why: "Storage locations are how stock counts get organised. Counting by area is faster and far less error-prone than one giant list.",
    benefit:
      "With locations set up, stock counts become a quick walk-around and I can pinpoint exactly where shrinkage is happening.",
    ctaLabel: "Add storage locations",
  },
};
