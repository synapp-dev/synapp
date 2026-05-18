import { z } from "zod";

export const dashboardKpiLabourContextSchema = z.object({
  kpiId: z.literal("labour"),
  kpiTitle: z.string().max(120),
  kpiValueDisplay: z.string().max(64),
  deltaDirection: z.enum(["up", "down"]),
  deltaPercent: z.number().finite(),
  targetDisplay: z.string().max(64).optional(),
  targetMissed: z.boolean().optional(),
});

export type DashboardKpiLabourContext = z.infer<
  typeof dashboardKpiLabourContextSchema
>;

export function parseOptionalDashboardKpiLabourContext(
  body: Record<string, unknown>,
): DashboardKpiLabourContext | undefined {
  const raw = body.dashboardKpiLabourContext;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const parsed = dashboardKpiLabourContextSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function buildDashboardKpiLabourSystemAppend(
  ctx: DashboardKpiLabourContext,
): string {
  const target =
    ctx.targetDisplay != null && ctx.targetDisplay !== ""
      ? ` Target line on the card: ${ctx.targetDisplay}.`
      : "";
  const missed =
    ctx.targetMissed === true
      ? " The dashboard marks this KPI as missing the target."
      : "";
  const deltaDir = ctx.deltaDirection === "up" ? "up" : "down";
  return [
    "Private context from the app (the user's chat bubble only shows a short summary line):",
    `They opened Superbot from the "${ctx.kpiTitle}" KPI on the dashboard.`,
    `Card headline value: ${ctx.kpiValueDisplay} (${deltaDir} ${Math.abs(ctx.deltaPercent).toFixed(1)}% vs previous week).`,
    `${target}${missed}`,
    "Reply in 2–4 short sentences on what labour % means for a venue and what to watch when it moves.",
    "Then call suggestAppNavigation once with a single card to Labour insights (destination key insights_labour) using the organisation and venue from the app shell focus—use those focus slugs; do not ask the user to confirm.",
    "After the tool runs, do not repeat the destination URL or path in prose; the UI shows the navigation card.",
  ].join(" ");
}
