import { z } from "zod";

const packUnitSchema = z.enum(["g", "kg", "mL", "L", "each"]);

const ingredientCategorySchema = z.enum([
  "proteins",
  "produce",
  "dairy",
  "dry-goods",
  "beverages",
  "oils-condiments",
  "other",
]);

export const normalisationSuggestionSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  likelyNonInventory: z.boolean(),
  nonInventoryReason: z.string().nullable(),
  productName: z.string(),
  packLabel: z.string(),
  unitsPerPack: z.number().positive(),
  packUnit: packUnitSchema,
  unitPriceCents: z.number().int().nonnegative().nullable(),
  ingredientName: z.string(),
  ingredientCategory: ingredientCategorySchema,
  ingredientUnit: z.string(),
  rationale: z.string(),
});

export type NormalisationSuggestion = z.infer<typeof normalisationSuggestionSchema>;

export const suggestNormalisationBodySchema = z.object({
  rawItemId: z.string().uuid(),
  /** A user-requested retry — nudge the model toward a different reading. */
  regenerate: z.boolean().optional(),
});

export const supplierProductCommitSchema = z.object({
  name: z.string().min(1),
  skuCode: z.string().nullable().optional(),
  packLabel: z.string().min(1),
  unitsPerPack: z.number().positive(),
  packUnit: packUnitSchema,
  unitPriceCents: z.number().int().nonnegative(),
  // Per-piece size (e.g. a 160 g fillet sold by the kg). Informational — does not
  // affect cost. When omitted, the server derives it from invoice wording.
  portionSize: z.number().positive().nullable().optional(),
  portionUnit: packUnitSchema.nullable().optional(),
  portionLabel: z.string().nullable().optional(),
});

export const ingredientCreateCommitSchema = z.object({
  name: z.string().min(1),
  category: ingredientCategorySchema,
  unit: z.string().min(1),
  costPerUnitCents: z.number().int().nonnegative().optional(),
  currentStockLevel: z.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  supplierId: z.string().uuid().nullable().optional(),
});

// Other raw items that are the same product in different invoice wording / order
// quantities — normalised in one go, linked to the same supplier product, so the
// user doesn't re-enter "Breast Fillet" once per pack size.
const alsoRawItemIdsSchema = z.array(z.string().uuid()).optional();

// Extra pack representations of the SAME ingredient priced differently on
// invoices (e.g. "each" alongside "bag"). Each becomes its own supplier_product
// linked to its own raw item; the primary `supplierProduct` stays the active
// costing source. Listed raw items are excluded from the `alsoRawItemIds`
// cascade so they link to their own pack rather than the base one.
const additionalPackSchema = z.object({
  rawItemId: z.string().uuid(),
  supplierProduct: supplierProductCommitSchema,
});
const additionalPacksSchema = z.array(additionalPackSchema).optional();

export const normaliseCommitBodySchema = z.discriminatedUnion("mode", [
  z.object({
    rawItemId: z.string().uuid(),
    mode: z.literal("create"),
    ingredient: ingredientCreateCommitSchema,
    supplierProduct: supplierProductCommitSchema,
    makeActiveSource: z.boolean().optional(),
    alsoRawItemIds: alsoRawItemIdsSchema,
    additionalPacks: additionalPacksSchema,
  }),
  z.object({
    rawItemId: z.string().uuid(),
    mode: z.literal("link"),
    ingredientId: z.string().uuid(),
    supplierProduct: supplierProductCommitSchema,
    makeActiveSource: z.boolean().optional(),
    alsoRawItemIds: alsoRawItemIdsSchema,
    additionalPacks: additionalPacksSchema,
  }),
]);

export type NormaliseCommitInput = z.infer<typeof normaliseCommitBodySchema>;
