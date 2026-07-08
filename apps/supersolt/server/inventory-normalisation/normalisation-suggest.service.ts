import { anthropic } from "@ai-sdk/anthropic";
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
  /** Nudge the model toward a different reading on a user-requested retry. */
  vary?: boolean;
}): Promise<NormalisationSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new SuggestUnavailableError("ANTHROPIC_API_KEY is not configured");
  }

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: normalisationSuggestionSchema,
    temperature: args.vary ? 0.7 : 0.2,
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
          "- unitsPerPack + packUnit: the measurable content of ONE pack in g, kg, mL, L, or each. " +
          'Read any size baked into the description — "Red Onion Peeled 10kg" sold by the bag means 10 + kg per bag. ' +
          "When the unit is non-metric (bunch, bag, punnet, each…) and no size is stated, ESTIMATE the typical " +
          "metric weight or volume of one such pack in Australia (e.g. a bunch of basil ≈ 30 g, a bunch of " +
          "bananas ≈ 1 kg), picking g/kg/mL/L sensibly. Prefer a metric unit over each for produce sold loosely.\n" +
          "- ingredientName: a short master-inventory name. Drop pack sizes and brand noise, and move " +
          'processing descriptors into parentheses — e.g. "Red Onion Peeled 10kg" → "Red Onion (Peeled)".\n' +
          "- ingredientCategory + ingredientUnit for the master inventory list\n" +
          "- likelyNonInventory: true for fees, surcharges, freight, credits — not food inventory\n" +
          "- unitPriceCents: pack price in cents if inferable from the description, else null\n" +
          (args.vary
            ? "The user wasn't happy with the previous interpretation — offer a different, still-plausible reading.\n"
            : "") +
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
  /** User-requested retry — ask the model for a different reading. */
  vary?: boolean;
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
        vary: args.vary,
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
