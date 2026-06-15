import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const parsedLineSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  unitPrice: z.number().nullable().describe("Unit price in dollars"),
  lineTotal: z.number().nullable().describe("Line total in dollars"),
  isLikelyInventory: z
    .boolean()
    .describe(
      "True if this row is a real purchasable product/ingredient we'd stock-count (e.g. 'Gourmet Tomato 10KG'). False for non-inventory lines like invoice references, due-date/summary rows, freight, surcharges, rounding, deposits, or totals.",
    ),
});

const parsedInvoiceSchema = z.object({
  supplierName: z.string().nullable(),
  supplierAbn: z.string().nullable(),
  // Supplier-header contact/address fields are `.optional()` rather than
  // `.nullable()` on purpose: Anthropic structured output caps a schema at 16
  // union-typed parameters, and every nullable field is a union. Optional
  // fields are simply omitted when absent, so they don't count toward the cap.
  supplierEmail: z.string().optional().describe("Supplier's contact email, if shown"),
  supplierPhone: z.string().optional().describe("Supplier's phone number, if shown"),
  supplierAddressLine1: z.string().optional(),
  supplierAddressLine2: z.string().optional(),
  supplierSuburb: z.string().optional(),
  supplierState: z.string().optional().describe("Australian state, e.g. VIC, NSW"),
  supplierPostcode: z.string().optional(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable().describe("ISO date YYYY-MM-DD"),
  dueDate: z.string().nullable().describe("ISO date YYYY-MM-DD"),
  subtotal: z.number().nullable(),
  gstTotal: z.number().nullable(),
  total: z.number().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  lineItems: z.array(parsedLineSchema),
});

export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>;

export type ParseTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ParseInvoiceDocumentResult = {
  parsed: ParsedInvoice;
  usage: ParseTokenUsage | null;
};

function dollarsToCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function mapParsedInvoiceToLineInserts(
  parsed: ParsedInvoice,
  organisationId: string,
  venueId: string,
) {
  return parsed.lineItems.map((line, index) => ({
    parsedDescription: line.description,
    quantity: line.quantity,
    unit: line.unit,
    unitPriceCents: dollarsToCents(line.unitPrice),
    lineTotalCents: dollarsToCents(line.lineTotal),
    isUnmapped: true,
    mappingMethod: null as string | null,
    sortOrder: index,
    isLikelyInventory: line.isLikelyInventory,
    organisationId,
    venueId,
  }));
}

export async function parseInvoiceDocument(args: {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<ParseInvoiceDocumentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const isImage = args.mimeType.startsWith("image/");
  const isPdf = args.mimeType === "application/pdf";

  if (!isImage && !isPdf) {
    throw new Error(`Unsupported file type: ${args.mimeType}`);
  }

  const base64 = args.bytes.toString("base64");
  const dataUrl = isPdf
    ? `data:application/pdf;base64,${base64}`
    : `data:${args.mimeType};base64,${base64}`;

  const { object, usage } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: parsedInvoiceSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract supplier invoice data from this Australian hospitality supplier bill. " +
              "From the header capture the supplier's name, ABN, contact email, phone, and postal address (line 1/2, suburb, state, postcode) when shown. " +
              "Return structured JSON with one lineItems entry per row in the table. " +
              "For each line capture description/item name, quantity, unit (if shown), unit price, and line total when present. " +
              "Set isLikelyInventory true for real purchasable products/ingredients we'd stock-count, and false for non-inventory lines (invoice references, due-date or summary rows, freight, surcharges, rounding, deposits, totals). " +
              "Amounts in AUD dollars. Set confidence high only when all key fields are clearly readable.",
          },
          isImage
            ? { type: "image", image: dataUrl }
            : {
                type: "file",
                data: args.bytes,
                mediaType: "application/pdf",
              },
        ],
      },
    ],
  });

  return {
    parsed: object,
    usage: usage
      ? {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        }
      : null,
  };
}

export function fuzzyMatchSupplier(
  suppliers: Array<{ id: string; name: string; orderingEmail: string | null }>,
  parsed: ParsedInvoice,
  fromEmail?: string,
): string | null {
  const name = parsed.supplierName?.trim().toLowerCase();
  const emailDomain = fromEmail?.split("@")[1]?.toLowerCase();

  for (const s of suppliers) {
    if (name && s.name.trim().toLowerCase() === name) return s.id;
    if (name && s.name.trim().toLowerCase().includes(name)) return s.id;
    if (emailDomain && s.orderingEmail?.toLowerCase().includes(emailDomain)) return s.id;
  }
  return null;
}

export function fuzzyMatchSupplierProduct(
  products: Array<{ id: string; name: string; ingredientId: string | null }>,
  description: string,
): { supplierProductId: string; ingredientId: string | null } | null {
  const q = description.trim().toLowerCase();
  if (!q) return null;

  let best: { id: string; ingredientId: string | null; score: number } | null = null;

  for (const p of products) {
    const name = p.name.trim().toLowerCase();
    let score = 0;
    if (name === q) score = 1;
    else if (name.includes(q) || q.includes(name)) score = 0.7;
    else {
      const qWords = q.split(/\s+/);
      const matchCount = qWords.filter((w) => name.includes(w)).length;
      score = matchCount / Math.max(qWords.length, 1);
    }
    if (!best || score > best.score) {
      best = { id: p.id, ingredientId: p.ingredientId, score };
    }
  }

  if (!best || best.score < 0.5) return null;
  return { supplierProductId: best.id, ingredientId: best.ingredientId };
}
