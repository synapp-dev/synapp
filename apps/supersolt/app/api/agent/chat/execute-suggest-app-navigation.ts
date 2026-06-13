import {
  suggestAppNavigationInputSchema,
  suggestAppNavigationSuccessSchema,
  type SuggestAppNavigationOutput,
} from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import { resolveAppNavigationCards } from "@/entities/ai-agent-chat/lib/resolve-app-navigation-cards";
import type { RequestAuthContext } from "@/server/auth/context";
import { resolveAgentVenueScopeForNavigation } from "@/server/agent/agent-tool-scope";

const ACCESS_DENIED_MESSAGE =
  "You don't have access to that organisation or venue.";

function navigationLog(
  event:
    | "agent.tool.navigation_started"
    | "agent.tool.navigation_finished"
    | "agent.tool.navigation_denied",
  payload: Record<string, unknown>,
) {
  console.info(JSON.stringify({ event, ...payload }));
}

export type ExecuteSuggestAppNavigationArgs = {
  ctx: RequestAuthContext;
  rawInput: unknown;
  requestId?: string | null;
};

export async function executeSuggestAppNavigation({
  ctx,
  rawInput,
  requestId,
}: ExecuteSuggestAppNavigationArgs): Promise<SuggestAppNavigationOutput> {
  const parsed = suggestAppNavigationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    navigationLog("agent.tool.navigation_denied", {
      request_id: requestId ?? undefined,
      reason_code: "invalid_input",
    });
    return {
      error: {
        code: "INVALID_INPUT",
        message:
          "Some navigation details were invalid. Check organisation and venue slugs.",
      },
    };
  }

  const input = parsed.data;
  const destinationKeys = [...input.destinationKeys];

  navigationLog("agent.tool.navigation_started", {
    request_id: requestId ?? undefined,
    destination_keys: destinationKeys,
  });

  const venueResult = await resolveAgentVenueScopeForNavigation(
    ctx,
    input.organisationSlug,
    input.venueSlug,
  );

  if ("denied" in venueResult) {
    navigationLog("agent.tool.navigation_denied", {
      request_id: requestId ?? undefined,
      reason_code: venueResult.reason,
    });
    return {
      error: {
        code: "ACCESS_DENIED",
        message: ACCESS_DENIED_MESSAGE,
      },
    };
  }

  const cards = resolveAppNavigationCards({
    organisationSlug: input.organisationSlug,
    venueSlug: input.venueSlug,
    organisationName: venueResult.organisationName,
    venueName: venueResult.venueName,
    destinationKeys,
  });

  const success = suggestAppNavigationSuccessSchema.parse({ cards });

  navigationLog("agent.tool.navigation_finished", {
    request_id: requestId ?? undefined,
    card_count: cards.length,
  });

  return success;
}
