import type { ReadinessSuggestionDto } from "@/entities/readiness/model/types";
import type { InsightsAlertRow } from "@/entities/insights/model/types";
import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";

export function readinessSuggestionToSuperbot(
  suggestion: ReadinessSuggestionDto,
): SuperbotSuggestion {
  return {
    id: suggestion.id,
    gridLabel: suggestion.gridLabel,
    title: suggestion.title,
    description: suggestion.description,
    ctaLabel: suggestion.ctaLabel,
    pathSuffix: suggestion.pathSuffix,
    iconId: suggestion.iconId,
    pageFollowUpQuestion: suggestion.pageFollowUpQuestion,
  };
}

export function insightsAlertToSuperbot(alert: InsightsAlertRow): SuperbotSuggestion {
  const pathSuffix =
    typeof alert.destinationPayload?.pathSuffix === "string"
      ? alert.destinationPayload.pathSuffix
      : alert.module === "sales"
        ? "insights/sales"
        : alert.module === "labour"
          ? "insights/labour"
          : alert.module === "inventory"
            ? "insights/inventory"
            : "insights/p-and-l";

  return {
    id: `insight-${alert.id}`,
    gridLabel: alert.module.charAt(0).toUpperCase() + alert.module.slice(1),
    title: alert.headline,
    description: alert.supportingMetric ?? alert.headline,
    ctaLabel: "View insight",
    pathSuffix,
    iconId: alert.module === "labour" ? "users" : "utensils",
  };
}
