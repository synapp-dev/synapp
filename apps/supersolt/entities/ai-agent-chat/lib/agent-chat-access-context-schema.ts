import { z } from "zod";

const tenantSlugSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const MAX_ORGANISATIONS = 40;
const MAX_VENUES_TOTAL = 200;

export const accessContextVenueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: tenantSlugSchema,
  suburb: z.string().max(200).nullable(),
  state: z.string().max(120).nullable(),
  venueType: z.string().max(80),
  roleSlug: z.string().max(80),
  roleDisplayName: z.string().max(120),
  grantsOrgAdmin: z.boolean(),
});

export const accessContextOrganisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: tenantSlugSchema,
  logoUrl: z.string().max(2048).nullable(),
  roleSlug: z.string().max(80),
  roleDisplayName: z.string().max(120),
  grantsOrgAdmin: z.boolean(),
  venues: z.array(accessContextVenueSchema).max(80),
});

export const agentChatAccessContextSchema = z
  .object({
    organisations: z.array(accessContextOrganisationSchema).max(MAX_ORGANISATIONS),
  })
  .superRefine((val, ctx) => {
    const totalVenues = val.organisations.reduce((acc, o) => acc + o.venues.length, 0);
    if (totalVenues > MAX_VENUES_TOTAL) {
      ctx.addIssue({
        code: "custom",
        message: `At most ${MAX_VENUES_TOTAL} venues across all organisations`,
        path: ["organisations"],
      });
    }
  });

export type AgentChatAccessContext = z.infer<typeof agentChatAccessContextSchema>;

export function focusPairExistsInAccessContext(
  accessContext: AgentChatAccessContext,
  organisationSlug: string,
  venueSlug: string
): boolean {
  const org = accessContext.organisations.find((o) => o.slug === organisationSlug);
  if (!org) return false;
  return org.venues.some((v) => v.slug === venueSlug);
}

export function parseOptionalAgentChatAccessContext(
  raw: unknown
): { ok: true; value: AgentChatAccessContext } | { ok: false } {
  if (raw === undefined || raw === null) {
    return { ok: false };
  }
  const parsed = agentChatAccessContextSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, value: parsed.data };
}

export function parseFocusSlugs(body: Record<string, unknown>): {
  organisationSlug?: string;
  venueSlug?: string;
} {
  const org = body.focusOrganisationSlug;
  const venue = body.focusVenueSlug;
  if (typeof org !== "string" || typeof venue !== "string") {
    return {};
  }
  const orgParsed = tenantSlugSchema.safeParse(org);
  const venueParsed = tenantSlugSchema.safeParse(venue);
  if (!orgParsed.success || !venueParsed.success) {
    return {};
  }
  return { organisationSlug: orgParsed.data, venueSlug: venueParsed.data };
}
