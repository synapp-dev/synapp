import { z } from "zod";

export const adminMapUpdateSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(128)
    .regex(
      /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
      "Slug: lowercase letters, numbers, underscores, hyphens only.",
    ),
  displayName: z.string().min(1).max(255),
  poolId: z.string().uuid(),
  radarImageUrl: z.string().max(8000),
  badgeImageUrl: z.string().max(8000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000),
});

export type AdminMapUpdateInput = z.infer<typeof adminMapUpdateSchema>;
