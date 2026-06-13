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
});

export const supplierProductCommitSchema = z.object({
  name: z.string().min(1),
  skuCode: z.string().nullable().optional(),
  packLabel: z.string().min(1),
  unitsPerPack: z.number().positive(),
  packUnit: packUnitSchema,
  unitPriceCents: z.number().int().nonnegative(),
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

export const normaliseCommitBodySchema = z.discriminatedUnion("mode", [
  z.object({
    rawItemId: z.string().uuid(),
    mode: z.literal("create"),
    ingredient: ingredientCreateCommitSchema,
    supplierProduct: supplierProductCommitSchema,
    makeActiveSource: z.boolean().optional(),
  }),
  z.object({
    rawItemId: z.string().uuid(),
    mode: z.literal("link"),
    ingredientId: z.string().uuid(),
    supplierProduct: supplierProductCommitSchema,
    makeActiveSource: z.boolean().optional(),
  }),
]);

export type NormaliseCommitInput = z.infer<typeof normaliseCommitBodySchema>;
