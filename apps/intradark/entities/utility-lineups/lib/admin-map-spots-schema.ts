import { z } from "zod";

const spotSlug = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
    "Slug: lowercase letters, numbers, underscores, hyphens only.",
  );

export const adminMapSpotCreateSchema = z.object({
  mapId: z.string().uuid(),
  slug: spotSlug,
  label: z.string().min(1).max(4000),
  radarX: z.number().finite().gte(0).lte(1),
  radarY: z.number().finite().gte(0).lte(1),
});

export const adminMapSpotUpdateSchema = z.object({
  id: z.string().uuid(),
  slug: spotSlug,
  label: z.string().min(1).max(4000),
  radarX: z.number().finite().gte(0).lte(1),
  radarY: z.number().finite().gte(0).lte(1),
});

export const adminMapSpotDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type AdminMapSpotCreateInput = z.infer<typeof adminMapSpotCreateSchema>;
export type AdminMapSpotUpdateInput = z.infer<typeof adminMapSpotUpdateSchema>;
