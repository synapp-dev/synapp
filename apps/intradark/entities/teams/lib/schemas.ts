import { z } from "zod";

import { validateTeamSlug } from "./slug";

const teamAvatarObjectPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (v) => v.startsWith("avatars/teams/"),
    "Invalid team avatar path.",
  );

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Use a valid hex colour (e.g. #0483c8).")
  .optional()
  .nullable();

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
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
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
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
  })
  .superRefine((val, ctx) => {
    slugRefinement(val.slug, ctx);
  });

export const setTeamAvatarSchema = z.object({
  teamId: z.string().uuid(),
  objectPath: teamAvatarObjectPathSchema.nullable(),
});
