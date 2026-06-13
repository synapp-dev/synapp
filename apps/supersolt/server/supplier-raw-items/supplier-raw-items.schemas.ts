import { z } from "zod";

export const rawItemSourceSchema = z.enum(["xero_api", "invoice_parse", "manual"]);

export const createRawItemSchema = z.object({
  rawDescription: z.string().trim().min(1, "Description is required"),
  rawUnit: z.string().trim().optional().nullable(),
  lastQuantity: z.number().optional().nullable(),
  lastUnitPriceCents: z.number().int().optional().nullable(),
  lastLineTotalCents: z.number().int().optional().nullable(),
});

export const updateRawItemSchema = createRawItemSchema.partial();

export type CreateRawItemInput = z.infer<typeof createRawItemSchema>;
export type UpdateRawItemInput = z.infer<typeof updateRawItemSchema>;
