import { z } from "zod";

import { validateSlug } from "./slug";

export const createArticleDraftSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  slug: z.string().trim().max(160).optional(),
  excerpt: z.string().max(4000).optional().nullable(),
});

export const updateArticleDraftSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(1).max(160),
  excerpt: z.string().max(4000).optional().nullable(),
  bodyJson: z.unknown(),
});

export const articleIdSchema = z.object({
  id: z.string().uuid(),
});

const slugRefinement = (slug: string, ctx: z.RefinementCtx) => {
  const res = validateSlug(slug);
  if (!res.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        res.code === "reserved"
          ? "This slug is reserved. Pick another."
          : "Invalid slug.",
      path: ["slug"],
    });
  }
};

export const createArticleDraftSchemaWithSlug = createArticleDraftSchema.superRefine(
  (val, ctx) => {
    if (val.slug !== undefined && val.slug.length > 0) {
      slugRefinement(val.slug, ctx);
    }
  },
);

export const updateArticleDraftSchemaWithSlug = updateArticleDraftSchema.superRefine(
  (val, ctx) => {
    slugRefinement(val.slug, ctx);
  },
);
