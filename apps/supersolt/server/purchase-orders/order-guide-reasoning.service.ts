import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

import type { RequestAuthContext } from "@/server/auth/context";
import {
  orderGuideService,
  type OrderGuidePeriodPreset,
  type OrderGuideResponse,
} from "./order-guide.service";
import { PurchaseOrdersServiceError } from "./purchase-orders.service";

const REASONING_MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 700;

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * Condense the guide into a compact grounding payload — only what the
 * model needs to reason, never raw DB rows.
 */
function buildGroundingSummary(guide: OrderGuideResponse, venueName: string): string {
  const suppliers = guide.suggestionsBySupplier.map((group) => ({
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

const SYSTEM_PROMPT = `You are Superbot, the procurement brain inside Supersolt, briefing a venue operator on this order run. You are given the computed order guide as JSON: per supplier, the suggested lines with the exact math inputs (demand over the horizon, average daily usage, stock on hand, pending deliveries, buffer, pack rounding) and data-quality flags.

Write a short, sharp briefing in plain text:
- Start with a one-sentence read of the whole run (how many suppliers, rough total, anything urgent).
- Then one short paragraph or 2-4 bullet lines per supplier: lead with the lines that matter (biggest spend or tightest stock) and give the reason in operator language, e.g. "you're burning ~2.4kg of pastrami a day and have under two days left on the shelf, so 3 cartons covers the week with the 15% buffer".
- Call out data-quality caveats honestly: lines using a revenue proxy instead of real usage, stock assumed zero without a count, below-minimum supplier orders (say what to add or whether to hold the order).
- Flag anything that looks off (a line far bigger than its daily usage implies, buffer doing all the work, etc.).
- No headings, no markdown syntax beyond simple dashes for bullets, no restating every line — pick what matters. Keep it under 250 words. Do not use em dashes.`;

export const orderGuideReasoningService = {
  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async streamReasoning(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      periodPreset?: OrderGuidePeriodPreset;
    },
  ): Promise<Response> {
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

    const result = streamText({
      model: anthropic(REASONING_MODEL),
      system: SYSTEM_PROMPT,
      prompt: buildGroundingSummary(guide, args.venueSlug),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return result.toTextStreamResponse();
  },
};
