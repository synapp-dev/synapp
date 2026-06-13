import type {
  ReadinessBlockerDto,
  ReadinessCheckId,
  ReadinessModuleId,
  ReadinessSuggestionDto,
} from "@/entities/readiness/model/types";

export type ReadinessModuleDefinition = {
  id: ReadinessModuleId;
  title: string;
  /** Hide leaf nav item entirely while locked (hybrid nav). */
  hideNavWhenLocked: boolean;
  requiredChecks: ReadinessCheckId[];
  suggestion: Pick<
    ReadinessSuggestionDto,
    | "gridLabel"
    | "title"
    | "description"
    | "ctaLabel"
    | "pathSuffix"
    | "iconId"
    | "pageFollowUpQuestion"
  >;
};

export const READINESS_CHECK_BLOCKERS: Record<
  ReadinessCheckId,
  ReadinessBlockerDto
> = {
  has_suppliers: {
    checkId: "has_suppliers",
    taskId: "add-suppliers",
    title: "Add suppliers",
    description:
      "Connect Xero to import suppliers automatically, or add them manually before mapping ingredients.",
    pathSuffix: "settings/inventory-setup/suppliers",
    ctaLabel: "Open suppliers",
  },
  has_mapped_ingredients: {
    checkId: "has_mapped_ingredients",
    taskId: "map-ingredients",
    title: "Map ingredients to suppliers",
    description:
      "Add ingredients and link each one to a supplier product so stock counts and ordering use accurate costs.",
    pathSuffix: "settings/inventory-setup/master-inventory-list",
    ctaLabel: "Open ingredients",
  },
  has_team_members: {
    checkId: "has_team_members",
    taskId: "add-team",
    title: "Add team members",
    description:
      "Invite staff in People so you can assign shifts when building the roster.",
    pathSuffix: "workforce/people",
    ctaLabel: "Open people",
  },
};

export const READINESS_MODULES: ReadinessModuleDefinition[] = [
  {
    id: "menu-ingredients",
    title: "Ingredients",
    hideNavWhenLocked: false,
    requiredChecks: ["has_suppliers"],
    suggestion: {
      gridLabel: "Ingredients",
      title: "Set up your ingredients",
      description:
        "You have suppliers — next, add ingredients and link them to supplier products for accurate costing.",
      ctaLabel: "Open ingredients",
      pathSuffix: "settings/inventory-setup/master-inventory-list",
      iconId: "utensils",
      pageFollowUpQuestion:
        "Want help linking your first ingredient to a supplier product?",
    },
  },
  {
    id: "purchasing-orders",
    title: "Order guide",
    hideNavWhenLocked: true,
    requiredChecks: ["has_suppliers", "has_mapped_ingredients"],
    suggestion: {
      gridLabel: "Order Guide",
      title: "Create your order guide",
      description:
        "Once ingredients are mapped to suppliers, refresh par levels and build the order guide for incoming deliveries.",
      ctaLabel: "Open order guide",
      pathSuffix: "purchasing/orders",
      iconId: "clipboard-list",
      pageFollowUpQuestion:
        "Shall we walk through setting par levels for your top categories?",
    },
  },
  {
    id: "stock-counts",
    title: "Stock counts",
    hideNavWhenLocked: true,
    requiredChecks: ["has_suppliers", "has_mapped_ingredients"],
    suggestion: {
      gridLabel: "Stock Counts",
      title: "Run your first stock count",
      description:
        "Ingredients are mapped — you can start stock counts to track on-hand levels and variance.",
      ctaLabel: "Open stock counts",
      pathSuffix: "stock-management/stock-counts",
      iconId: "clipboard-list",
      pageFollowUpQuestion:
        "Would you like help scheduling your first stock count?",
    },
  },
  {
    id: "stock-waste",
    title: "Waste",
    hideNavWhenLocked: true,
    requiredChecks: ["has_suppliers", "has_mapped_ingredients"],
    suggestion: {
      gridLabel: "Waste",
      title: "Record waste",
      description:
        "Track waste against mapped ingredients to keep inventory and food cost accurate.",
      ctaLabel: "Open waste",
      pathSuffix: "stock-management/waste",
      iconId: "clipboard-list",
    },
  },
  {
    id: "workforce-roster",
    title: "Roster",
    hideNavWhenLocked: true,
    requiredChecks: ["has_team_members"],
    suggestion: {
      gridLabel: "Weekly Roster",
      title: "Build your roster",
      description:
        "Add team members in People first, then create and publish shifts for the week ahead.",
      ctaLabel: "Open roster",
      pathSuffix: "workforce/roster",
      iconId: "calendar",
      pageFollowUpQuestion:
        "Would you like help filling open shifts before you publish?",
    },
  },
];

export const READINESS_MODULE_BY_ID = Object.fromEntries(
  READINESS_MODULES.map((module) => [module.id, module]),
) as Record<ReadinessModuleId, ReadinessModuleDefinition>;

export const CORE_GREEN_CHECKS: ReadinessCheckId[] = [
  "has_suppliers",
  "has_mapped_ingredients",
  "has_team_members",
];

export {
  PATH_SUFFIX_TO_READINESS_MODULE,
  readinessModuleIdFromPathSuffix,
} from "@/entities/readiness/lib/module-paths";
