import { z } from "zod";

export const rawItemSourceSchema = z.enum(["xero_api", "invoice_parse", "manual"]);

export const createRawItemSchema = z.object({
  rawDescription: z.string().trim().min(1, "Description is required"),
  rawUnit: z.string().trim().optional().nullable(),
  lastQuantity: z.number().optional().nullable(),
  lastUnitPriceCents: z.number().int().optional().nullable(),
  lastLineTotalCents: z.number().int().optional().nullable(),
});

export const updateRawItemSchema = createRawItemSchema.partial().extend({
  /** Approve (true) or clear approval (false) — stamps reviewed_at/by. */
  reviewed: z.boolean().optional(),
});

export const approveRawItemsSchema = z.object({
  rawItemIds: z.array(z.string().uuid()).min(1, "Select at least one item"),
  reviewed: z.boolean().optional().default(true),
});

export const skipRawItemsSchema = z.object({
  rawItemIds: z.array(z.string().uuid()).min(1),
});

export const confirmItemsTriageSchema = z.object({
  /** Non-inventory rows the user rescued back to inventory. Empty = confirm all flags as-is. */
  rescueRawItemIds: z.array(z.string().uuid()).max(1000).optional().default([]),
});

export const approveAsProductsSchema = z.object({
  products: z
    .array(
      z.object({
        rawItemIds: z.array(z.string().uuid()).min(1),
        name: z.string().trim().min(1, "Product name is required"),
      }),
    )
    .min(1, "Nothing to approve"),
});

export type CreateRawItemInput = z.infer<typeof createRawItemSchema>;
export type UpdateRawItemInput = z.infer<typeof updateRawItemSchema>;
export type ApproveRawItemsInput = z.infer<typeof approveRawItemsSchema>;
export type SkipRawItemsInput = z.infer<typeof skipRawItemsSchema>;
export type ConfirmItemsTriageInput = z.input<typeof confirmItemsTriageSchema>;
export type ApproveAsProductsInput = z.infer<typeof approveAsProductsSchema>;
