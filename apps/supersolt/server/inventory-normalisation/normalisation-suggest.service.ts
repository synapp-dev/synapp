import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

import {
  normalisationSuggestionSchema,
  type NormalisationSuggestion,
} from "@/server/inventory-normalisation/inventory-normalisation.schemas";
import { classifyRawItemBucket } from "@/server/inventory-normalisation/classify-raw-item-bucket";
import type { PackHint } from "@/server/inventory-normalisation/extract-pack-hint";

export class SuggestUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuggestUnavailableError";
  }
}

function resolveUnitPriceCents(args: {
  suggested: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  lastQuantity: number | null;
}): number | null {
  if (args.suggested != null && args.suggested >= 0) return args.suggested;
  if (args.lastUnitPriceCents != null && args.lastUnitPriceCents > 0) {
    return args.lastUnitPriceCents;
  }
  if (
    args.lastLineTotalCents != null &&
    args.lastLineTotalCents > 0 &&
    args.lastQuantity != null &&
    args.lastQuantity > 0
  ) {
    return Math.round(args.lastLineTotalCents / args.lastQuantity);
  }
  return null;
}

async function callSuggestLlm(args: {
  rawDescription: string;
  rawUnit: string | null;
  supplierName: string;
}): Promise<NormalisationSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new SuggestUnavailableError("OPENAI_API_KEY is not configured");
  }

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: normalisationSuggestionSchema,
    messages: [
      {
        role: "user",
        content:
          "You help Australian hospitality venues normalise supplier invoice line items into structured inventory data.\n" +
          `Supplier: ${args.supplierName}\n` +
          `Raw line: ${args.rawDescription}\n` +
          `Raw unit field: ${args.rawUnit ?? "(none)"}\n\n` +
          "Return JSON that separates:\n" +
          "- productName: cleaned purchasable product name\n" +
          "- packLabel: how it is sold (box, carton, bag, each, etc.)\n" +
          "- unitsPerPack + packUnit: measurable content per pack (g, kg, mL, L, or each)\n" +
          "- ingredientName + ingredientCategory + ingredientUnit for the master inventory list\n" +
          "- likelyNonInventory: true for fees, surcharges, freight, credits — not food inventory\n" +
          "- unitPriceCents: pack price in cents if inferable from the description, else null\n" +
          "Use Australian hospitality context. Be conservative on confidence when ambiguous.",
      },
    ],
  });

  return object;
}

export async function suggestNormalisationForRawItem(args: {
  rawDescription: string;
  rawUnit: string | null;
  supplierName: string;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  lastQuantity: number | null;
  /** Deterministic pack size extracted from the invoice wording (e.g. "@160g"). */
  packHint?: PackHint | null;
}): Promise<NormalisationSuggestion> {
  const keywordBucket = classifyRawItemBucket({
    rawDescription: args.rawDescription,
    rawUnit: args.rawUnit,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const suggestion = await callSuggestLlm({
        rawDescription: args.rawDescription,
        rawUnit: args.rawUnit,
        supplierName: args.supplierName,
      });

      const likelyNonInventory =
        suggestion.likelyNonInventory || keywordBucket === "likely_non_inventory";

      // A deterministic pack size from the invoice wording ("@160g") beats the
      // LLM's guess for the pack fields — but never overrides a non-inventory line.
      const packOverride =
        args.packHint && !likelyNonInventory
          ? {
              packLabel: args.packHint.packLabel,
              unitsPerPack: args.packHint.unitsPerPack,
              packUnit: args.packHint.packUnit,
            }
          : {};

      return {
        ...suggestion,
        likelyNonInventory,
        nonInventoryReason: likelyNonInventory
          ? suggestion.nonInventoryReason ??
            (keywordBucket === "likely_non_inventory"
              ? "Matches non-inventory keywords"
              : "AI classified as non-inventory")
          : null,
        unitPriceCents: resolveUnitPriceCents({
          suggested: suggestion.unitPriceCents,
          lastUnitPriceCents: args.lastUnitPriceCents,
          lastLineTotalCents: args.lastLineTotalCents,
          lastQuantity: args.lastQuantity,
        }),
        ...packOverride,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof SuggestUnavailableError) {
    throw lastError;
  }

  throw new SuggestUnavailableError(
    lastError instanceof Error ? lastError.message : "Suggestion failed",
  );
}
