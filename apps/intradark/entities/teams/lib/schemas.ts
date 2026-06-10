import { z } from "zod";

import { validateTeamSlug } from "./slug";

const optionalAvatarUrl = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) => v === undefined || v === "" || z.string().url().safeParse(v).success,
    "Enter a valid image URL",
  )
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const slugRefinement = (slug: string, ctx: z.RefinementCtx) => {
  const res = validateTeamSlug(slug);
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

export const createTeamSchema = z
  .object({
    name: z.string().trim().min(1, "Team name is required").max(255),
    slug: z.string().trim().max(160).optional(),
    nickname: z.string().trim().max(255).optional(),
    description: z.string().trim().max(4000).optional(),
    avatarUrl: optionalAvatarUrl,
  })
  .superRefine((val, ctx) => {
    if (val.slug !== undefined && val.slug.length > 0) {
      slugRefinement(val.slug, ctx);
    }
  });

export const updateTeamSchema = z
  .object({
    teamId: z.string().uuid(),
    name: z.string().trim().min(1, "Team name is required").max(255),
    slug: z.string().trim().min(1).max(160),
    nickname: z.string().trim().max(255).optional().nullable(),
    description: z.string().trim().max(4000).optional().nullable(),
    avatarUrl: z
      .union([
        z.string().url(),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v ?? null)),
  })
  .superRefine((val, ctx) => {
    slugRefinement(val.slug, ctx);
  });
