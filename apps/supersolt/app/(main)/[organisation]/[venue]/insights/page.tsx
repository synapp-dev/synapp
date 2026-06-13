import { redirect } from "next/navigation";
import { buildScopedPath } from "@/lib/build-scoped-path";
import {
  DEFAULT_INSIGHTS_PRESET,
  buildInsightsPeriodQueryString,
} from "@/entities/insights/lib/period";

export default async function InsightsIndexPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  const salesPath = buildScopedPath(organisation, venue, "insights/sales");
  const query = buildInsightsPeriodQueryString({ preset: DEFAULT_INSIGHTS_PRESET });
  redirect(`${salesPath}?${query}`);
}
