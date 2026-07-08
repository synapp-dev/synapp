import {
  Boxes,
  ClipboardList,
  Coins,
  Layers,
  Percent,
  ReceiptText,
  Soup,
  Timer,
  TrendingUp,
  Trash2,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import type { InventorySetupWizardStageId } from "@/entities/inventory-setup/model/types";

/**
 * Copy + config for the multi-step superbot intro shown at the start of a stage
 * (and replayed by the root "welcome back" flow). Pure data only — choreography
 * lives in stage-intro-steps.tsx, mirroring the one-time welcome's structure.
 */
export type StageBenefit = { label: string; icon: LucideIcon };

export type StageIntroScript = {
  /** Short eyebrow above the lead, e.g. the stage name. */
  eyebrow: string;
  /** First line — shown instantly on the intro step. */
  lead: string;
  /** Supporting line under the lead. */
  sub: string;
  /** The "why it matters" line — streamed like the agent chat. */
  why: string;
  /** Lead-in for the benefit step. */
  benefitLead: string;
  /** What the bot can do once this stage is set up. */
  benefits: readonly StageBenefit[];
  /** Primary button label on the last step that dismisses into the stage. */
  cta: string;
};

const SCRIPTS: Record<InventorySetupWizardStageId, StageIntroScript> = {
  suppliers: {
    eyebrow: "Suppliers",
    lead: "Let's start with your suppliers.",
    sub: "Suppliers are the foundation of everything.",
    why: "Every ingredient, price and order traces back to who you buy it from — so getting suppliers right makes everything downstream accurate.",
    benefitLead: "Once your suppliers and their items are in, I can:",
    benefits: [
      { label: "Track price changes", icon: TrendingUp },
      { label: "Build order guides", icon: ClipboardList },
      { label: "Match invoices automatically", icon: ReceiptText },
    ],
    cta: "Let's add suppliers",
  },
  inventory: {
    eyebrow: "Inventory",
    lead: "Next up — your inventory.",
    sub: "Let's turn supplier items into trackable ingredients.",
    why: "I'll turn each supplier item into a trackable ingredient, so stock counts, recipe costs and orders all line up. Anything that isn't real stock, just skip and I'll leave it out.",
    benefitLead: "With trackable ingredients in place, I can:",
    benefits: [
      { label: "Run accurate stock counts", icon: ClipboardList },
      { label: "Flag waste and variance", icon: Trash2 },
      { label: "Cost every recipe to the cent", icon: Coins },
    ],
    cta: "Let's normalise items",
  },
  products: {
    eyebrow: "Products",
    lead: "Now let's set up your products.",
    sub: "Import your menu and give each item a recipe.",
    why: "Import your menu items from Square and give each one a recipe — that's how I work out the true cost of every dish and exactly what it draws from stock.",
    benefitLead: "Once your products have recipes, I can:",
    benefits: [
      { label: "Show each dish's true cost", icon: Soup },
      { label: "Track margins per item", icon: Percent },
      { label: "See what every dish uses", icon: Boxes },
    ],
    cta: "Let's add recipes",
  },
  storage: {
    eyebrow: "Storage",
    lead: "Last step — your storage areas.",
    sub: "Tell me where you keep your stock.",
    why: "Tell me where you keep stock — coolroom, dry store, the bar — so stock counts and par levels know where everything actually lives.",
    benefitLead: "With your storage areas mapped, I can:",
    benefits: [
      { label: "Count stock by location", icon: Warehouse },
      { label: "Set par levels per area", icon: Layers },
      { label: "Make stocktakes faster", icon: Timer },
    ],
    cta: "Let's add storage",
  },
};

export function buildStageIntroScript(
  stageId: InventorySetupWizardStageId,
  firstName: string | null,
): StageIntroScript {
  const base = SCRIPTS[stageId];
  if (stageId === "suppliers" && firstName?.trim()) {
    return { ...base, lead: `Let's start with your suppliers, ${firstName.trim()}.` };
  }
  return base;
}
