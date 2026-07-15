export type PosCatalogImportRow = {
  menuItemId: string;
  name: string;
  sectionName: string;
  groupId: string | null;
  groupName: string | null;
  description: string | null;
  priceCents: number;
  showOnMenu: boolean;
  status: string;
  squareCatalogObjectId: string | null;
  recipeId: string | null;
  recipeName: string | null;
  costPerServeCents: number | null;
  gpPercent: number | null;
  recipeCostIncomplete: boolean;
  /** Ingredient line count of the mapped recipe; null when unmapped. */
  recipeIngredientCount: number | null;
  modifierListCount: number;
  missingFromSquare: boolean;
  lastSoldAt: string | null;
  /** In use but no sale in the stale window: flag for review, never auto-off. */
  staleInUse: boolean;
};

export type PosCatalogImportListResponse = {
  rows: PosCatalogImportRow[];
  summary: {
    posImportRan: boolean;
    inUseMenuItemCount: number;
    mappedInUseCount: number;
  };
};

export type SquareCatalogImportResult = {
  menuItems: { created: number; updated: number; skipped: number };
  groups: { upserted: number };
  modifiers: { lists: number; modifiers: number; links: number };
  catalogPages: number;
  variationsSeen: number;
  seenCatalogObjectIds: string[];
  error: string | null;
};

export type PosItemModifierDetail = {
  modifierId: string;
  name: string;
  priceCents: number;
};

export type PosItemModifierList = {
  modifierListId: string;
  name: string;
  selectionType: string;
  enabled: boolean;
  minSelected: number | null;
  maxSelected: number | null;
  modifiers: PosItemModifierDetail[];
};

export type RecipeIngredientSuggestion = {
  name: string;
  ingredientId: string | null;
  quantity: number | null;
  unit: string | null;
  confidence: number;
};

export type RecipeIngredientSuggestionsResponse = {
  suggestions: RecipeIngredientSuggestion[];
};

/** One editable line in the products recipe wizard, resolved server-side. */
export type RecipeWizardLine = {
  ingredientId: string | null;
  name: string;
  /** Null when the deterministic fallback couldn't quantify. */
  quantity: number | null;
  unit: string;
  unitCostCents: number;
  matched: boolean;
};

export type RecipeWizardSuggestion = {
  serves: number;
  confidence: "high" | "medium" | "low";
  notes: string | null;
  fallbackUsed: boolean;
  lines: RecipeWizardLine[];
  estimatedCostPerServeCents: number;
};

export type PosItemModifiersResponse = {
  groupId: string | null;
  lists: PosItemModifierList[];
};

export type ImportFromSquareAcceptedResponse = {
  accepted: true;
  jobId: string;
  alreadyRunning?: boolean;
  alreadyCompleted?: boolean;
};
