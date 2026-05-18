import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";

export type SuperbotPageHandoff = {
  source: "superbot-suggestion";
  suggestionId: string;
  /** Normalised path after org/venue, e.g. `workforce/timesheets`. */
  pathSuffix: string;
  gridLabel: string;
  title: string;
  description: string;
  pageFollowUpQuestion: string;
};

export function normalizeSuperbotPathSuffix(raw: string): string {
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function superbotSuggestionToPageHandoff(
  suggestion: SuperbotSuggestion,
): SuperbotPageHandoff {
  const pathSuffix = normalizeSuperbotPathSuffix(suggestion.pathSuffix);
  const pageFollowUpQuestion =
    suggestion.pageFollowUpQuestion ??
    "Want a quick plan for what to check first on this page?";
  return {
    source: "superbot-suggestion",
    suggestionId: suggestion.id,
    pathSuffix,
    gridLabel: suggestion.gridLabel,
    title: suggestion.title,
    description: suggestion.description,
    pageFollowUpQuestion,
  };
}

export function buildSuperbotSuggestionAssistantText(
  suggestion: SuperbotSuggestion,
  placeLine: string | null,
): string {
  const scope =
    placeLine && placeLine.trim().length > 0
      ? `\n\nThis suggestion was for **${placeLine}**.`
      : "";
  return (
    `I’ve opened **${suggestion.gridLabel}** for you.${scope}\n\n` +
    `${suggestion.description}\n\n` +
    `If you’d like, we can work through next steps here together—just ask in the chat.`
  );
}

export function formatSuperbotScopePlaceLine(
  labels: { organisationName: string; venuePart: string } | null,
): string | null {
  if (!labels) return null;
  const org = labels.organisationName.trim();
  const venue = labels.venuePart.trim();
  if (!org && !venue) return null;
  if (org.toLowerCase() === venue.toLowerCase()) {
    return org || venue;
  }
  return `${org} · ${venue}`;
}
