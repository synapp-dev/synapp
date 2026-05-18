import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";

export function superbotSuggestionHref(
  suggestion: SuperbotSuggestion,
  scope: { organisationSlug: string; venueSlug: string } | null,
): string | null {
  if (!scope) {
    return null;
  }
  const suffix = suggestion.pathSuffix.replace(/^\/+/, "");
  return `/${scope.organisationSlug}/${scope.venueSlug}/${suffix}`;
}
