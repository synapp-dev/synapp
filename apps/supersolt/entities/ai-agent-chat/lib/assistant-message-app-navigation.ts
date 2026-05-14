import type { UIMessage } from "ai";

import type { AppNavigationCard } from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import { isSuggestAppNavigationSuccessPayload } from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";

/** Non-empty cards from a successful suggestAppNavigation tool part, if any. */
export function getSuccessfulAppNavigationCardsFromParts(
  parts: UIMessage["parts"],
): AppNavigationCard[] | null {
  for (const part of parts) {
    if (
      part.type === "tool-suggestAppNavigation" &&
      part.state === "output-available" &&
      isSuggestAppNavigationSuccessPayload(part.output) &&
      part.output.cards.length > 0
    ) {
      return part.output.cards;
    }
  }
  return null;
}
