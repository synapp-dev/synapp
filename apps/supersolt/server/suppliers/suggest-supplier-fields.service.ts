import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type { AuthError } from "@/server/auth/errors";
import type { RequestAuthContext } from "@/server/auth/context";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

export class SupplierSuggestionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SupplierSuggestionError";
  }
}

const SUPPLIER_CATEGORIES = [
  "produce",
  "meat",
  "dry-goods",
  "beverages",
  "equipment",
  "other",
] as const;
type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

// Deliberately narrow. The only supplier field we can *infer* (rather than
// extract) is the category — driven by the business name + the items they've
// supplied. We never ask the model to guess an ABN, email or phone: those are
// extracted from Xero / invoice headers when present, and a fabricated tax
// number or contact would be worse than an empty field.
const suggestionSchema = z.object({
  category: z
    .enum(SUPPLIER_CATEGORIES)
    .optional()
    .describe(
      "Best-fit category from the supplier name + the items they supply. Omit if genuinely unclear.",
    ),
  confidence: z.enum(["high", "medium", "low"]),
});

export type SupplierFieldSuggestions = {
  category: SupplierCategory | null;
};

export const suggestSupplierFieldsService = {
  async suggest(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; supplierId: string },
  ): Promise<{ suggestions: SupplierFieldSuggestions }> {
    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (message) => new SupplierSuggestionError(404, message),
        forbidden: (error: AuthError) =>
          new SupplierSuggestionError(403, error.message),
      },
    );

    const supplier = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
    );
    if (!supplier) {
      throw new SupplierSuggestionError(404, "Supplier not found");
    }

    const rawItems = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
    );
    const itemNames = Array.from(
      new Set(
        rawItems
          .map((i) => i.rawDescription?.trim())
          .filter((d): d is string => Boolean(d)),
      ),
    ).slice(0, 40);

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: suggestionSchema,
      // jsonTool avoids the native grammar-compile timeout (see invoice parser).
      providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are classifying a hospitality supplier for an Australian restaurant.\n" +
                `Supplier name: ${supplier.name}\n` +
                (itemNames.length
                  ? `Items they've supplied (from invoices):\n- ${itemNames.join("\n- ")}\n`
                  : "No item history is available — infer from the business name alone.\n") +
                "Pick the best-fit category: produce (fruit/veg/herbs), meat (meat & seafood), " +
                "dry-goods (pantry/packaged/cleaning), beverages (drinks/coffee/alcohol), " +
                "equipment (smallwares/hardware). Use 'other' only when none clearly fits. " +
                "Set confidence honestly; if you're only guessing from a vague name, use 'low'.",
            },
          ],
        },
      ],
    });

    // Only surface a confident, actionable category — never re-suggest the
    // "other" default, and drop low-confidence guesses.
    const category =
      object.category &&
      object.category !== "other" &&
      object.confidence !== "low"
        ? object.category
        : null;

    return { suggestions: { category } };
  },
};
