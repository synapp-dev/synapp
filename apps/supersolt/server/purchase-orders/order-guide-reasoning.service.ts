import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import type { RequestAuthContext } from "@/server/auth/context";
import {
  orderGuideService,
  type OrderGuidePeriodPreset,
  type OrderGuideResponse,
} from "./order-guide.service";
import { PurchaseOrdersServiceError } from "./purchase-orders.service";

const REASONING_MODEL = "claude-haiku-4-5";

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * Condense the guide into a compact grounding payload — only what the
 * model needs to reason, never raw DB rows. Every supplier carries its
 * `supplierId` so the model can key its read back to the exact card.
 */
function buildGroundingSummary(guide: OrderGuideResponse, venueName: string): string {
  const suppliers = guide.suggestionsBySupplier.map((group) => ({
    supplierId: group.supplierId,
    supplier: group.supplierName,
    leadTimeDays: group.leadTimeDays,
    subtotal: `$${(group.subtotalCents / 100).toFixed(2)}`,
    belowMinimum: group.belowMinimum
      ? `short $${(group.minimumShortfallCents / 100).toFixed(2)} of $${(group.minimumOrderCents / 100).toFixed(2)} minimum`
      : false,
    lines: group.lines.map((line) => ({
      ingredient: line.ingredientName,
      order: `${line.suggestedPackQuantity} x ${line.packLabel} (${formatQty(line.breakdown.unitsPerPack)} ${line.breakdown.packUnit}/pack) = $${(line.suggestedSubtotalCents / 100).toFixed(2)}`,
      demand: `${formatQty(line.breakdown.forecastedDemandBaseUnits)} ${line.baseUnit} over ${guide.forecastHorizonDays}d`,
      demandSource: line.breakdown.demandSource,
      avgDailyUsage:
        line.breakdown.avgDailyBaseUnits !== null
          ? `${formatQty(line.breakdown.avgDailyBaseUnits)} ${line.baseUnit}/day`
          : null,
      stockOnHand: `${formatQty(line.breakdown.currentStockBaseUnits)} ${line.baseUnit}`,
      pendingDeliveries: `${formatQty(line.breakdown.pendingDeliveriesBaseUnits)} ${line.baseUnit}`,
      bufferPercent: line.breakdown.bufferPercent,
      assumptions: line.breakdown.assumptions,
    })),
  }));

  return JSON.stringify(
    {
      venue: venueName,
      horizonDays: guide.forecastHorizonDays,
      flags: {
        coldStart: guide.coldStart,
        stockCountMissing: guide.stockCountMissing,
        demandRatesAvailable: guide.meta.demandRatesAvailable ?? false,
      },
      suppliers,
    },
    null,
    1,
  );
}

const supplierReadSchema = z.object({
  supplierId: z
    .string()
    .describe("The exact supplierId from the grounding payload this read is for"),
  headline: z
    .string()
    .describe(
      "One sharp sentence naming the line that matters most for this supplier and why (biggest spend or tightest stock), in operator language.",
    ),
  points: z
    .array(z.string())
    .describe(
      "2 to 4 short operator-language notes, one per important line. Lead with the reason, e.g. 'Cotoletta: burning 45/day on 28 in stock — 333 units covers the week + 15% buffer.' Do not restate every line.",
    ),
  watchouts: z
    .array(z.string())
    .describe(
      "Data-quality or risk caveats for this supplier only (revenue-proxy demand, stock assumed zero, below-minimum order, a line far bigger than its daily usage). Empty array when the run is clean.",
    ),
});

const reasoningSchema = z.object({
  runHeadline: z
    .string()
    .describe(
      "One sentence read of the whole run: supplier count, rough total spend, and anything urgent across the board. No markdown.",
    ),
  suppliers: z.array(supplierReadSchema),
});

export type OrderGuideSupplierRead = z.infer<typeof supplierReadSchema>;
export type OrderGuideReasoning = z.infer<typeof reasoningSchema>;

const SYSTEM_PROMPT = `You are Superbot, the procurement brain inside Supersolt, briefing a venue operator on this order run. You are given the computed order guide as JSON: per supplier (each with a supplierId), the suggested lines with the exact math inputs (demand over the horizon, average daily usage, stock on hand, pending deliveries, buffer, pack rounding) and data-quality flags.

Produce a structured read, not prose:
- runHeadline: one sentence on the whole run (how many suppliers, rough total spend, anything urgent).
- For every supplier in the payload, one entry keyed by its exact supplierId:
  - headline: one sharp sentence on the single line that matters most (biggest spend or tightest stock), in operator language, e.g. "You're burning ~2.4kg of pastrami a day with under two days on the shelf, so 3 cartons covers the week with the 15% buffer."
  - points: 2 to 4 short notes, one per important line, reason first. Do not restate every line — pick what matters (biggest spend, tightest stock, anything unusual). Keep each under ~20 words.
  - watchouts: only real caveats — a line using a revenue proxy instead of usage, stock assumed zero without a count, a below-minimum supplier order (say what to add or whether to hold), or a line far bigger than its daily usage implies. Empty array when clean.

Rules: plain operator language, no markdown syntax, no headings, no em dashes. Return an entry for every supplierId given, and never invent a supplierId that was not provided.`;

export const orderGuideReasoningService = {
  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async generateReasoning(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      periodPreset?: OrderGuidePeriodPreset;
    },
  ): Promise<OrderGuideReasoning> {
    if (!this.isAvailable()) {
      throw new PurchaseOrdersServiceError(
        503,
        "AI reasoning is not configured (missing ANTHROPIC_API_KEY)",
      );
    }

    // Reuses the cached guide — reasoning always narrates exactly what
    // the operator is looking at, never a divergent recompute.
    const guide = await orderGuideService.get(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      periodPreset: args.periodPreset,
    });

    if (guide.suggestionsBySupplier.length === 0) {
      throw new PurchaseOrdersServiceError(
        422,
        "Nothing to explain — the order guide has no suggestions",
      );
    }

    const { object } = await generateObject({
      model: anthropic(REASONING_MODEL),
      schema: reasoningSchema,
      temperature: 0.3,
      providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
      system: SYSTEM_PROMPT,
      prompt: buildGroundingSummary(guide, args.venueSlug),
    });

    return object;
  },
};
