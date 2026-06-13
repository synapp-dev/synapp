import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";
import type { RecipeCategory } from "@/entities/recipes/model/types";

export type RecipePrefill = {
  name: string;
  category: RecipeCategory;
  suggestedPriceCents: number;
};

const CATEGORY_KEYWORDS: Array<{ category: RecipeCategory; keywords: string[] }> = [
  {
    category: "drinks",
    keywords: ["drink", "coffee", "bev", "tea", "juice", "soda"],
  },
  {
    category: "desserts",
    keywords: ["dessert", "cake", "sweet", "ice cream", "gelato"],
  },
  { category: "sides", keywords: ["side", "fries", "chips"] },
  { category: "prep", keywords: ["prep", "batch", "base", "sauce", "stock"] },
];

/**
 * Best-effort map from a Square section/category name to a recipe category.
 * Defaults to `other`; the user can change it in the editor.
 */
export function mapSectionNameToRecipeCategory(sectionName: string): RecipeCategory {
  const haystack = sectionName.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return "other";
}

export function buildRecipePrefillFromPosLine(row: PosCatalogImportRow): RecipePrefill {
  return {
    name: row.name,
    category: mapSectionNameToRecipeCategory(row.sectionName),
    suggestedPriceCents: row.priceCents,
  };
}
