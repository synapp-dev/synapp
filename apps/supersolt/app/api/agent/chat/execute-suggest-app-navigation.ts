import type { SupabaseClient } from "@supabase/supabase-js";

import {
  suggestAppNavigationInputSchema,
  suggestAppNavigationSuccessSchema,
  type SuggestAppNavigationOutput,
} from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import { resolveAppNavigationCards } from "@/entities/ai-agent-chat/lib/resolve-app-navigation-cards";
import { assertUserHasVenueAccess, VenueAccessError } from "@/server/access/venue-access";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

const ACCESS_DENIED_MESSAGE =
  "You don't have access to that organisation or venue.";

function navigationLog(
  event:
    | "agent.tool.navigation_started"
    | "agent.tool.navigation_finished"
    | "agent.tool.navigation_denied",
  payload: Record<string, unknown>
) {
  console.info(JSON.stringify({ event, ...payload }));
}

export type ExecuteSuggestAppNavigationArgs = {
  supabase: Supabase;
  userId: string;
  rawInput: unknown;
  requestId?: string | null;
};

export async function executeSuggestAppNavigation({
  supabase,
  userId,
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
        message: "Some navigation details were invalid. Check organisation and venue slugs.",
      },
    };
  }

  const input = parsed.data;
  const destinationKeys = [...input.destinationKeys];

  navigationLog("agent.tool.navigation_started", {
    request_id: requestId ?? undefined,
    destination_keys: destinationKeys,
  });

  try {
    const venueContext = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      input.organisationSlug,
      input.venueSlug
    );

    if (!venueContext) {
      navigationLog("agent.tool.navigation_denied", {
        request_id: requestId ?? undefined,
        reason_code: "venue_not_found",
      });
      return {
        error: {
          code: "ACCESS_DENIED",
          message: ACCESS_DENIED_MESSAGE,
        },
      };
    }

    await assertUserHasVenueAccess(supabase, {
      userId,
      organisationId: venueContext.organisationId,
      venueId: venueContext.venueId,
    });

    const cards = resolveAppNavigationCards({
      organisationSlug: input.organisationSlug,
      venueSlug: input.venueSlug,
      organisationName: venueContext.organisationName,
      venueName: venueContext.venueName,
      destinationKeys,
    });

    const success = suggestAppNavigationSuccessSchema.parse({ cards });

    navigationLog("agent.tool.navigation_finished", {
      request_id: requestId ?? undefined,
      card_count: success.cards.length,
    });

    return success;
  } catch (error) {
    if (error instanceof VenueAccessError && error.status === 403) {
      navigationLog("agent.tool.navigation_denied", {
        request_id: requestId ?? undefined,
        reason_code: "venue_access_forbidden",
      });
      return {
        error: {
          code: "ACCESS_DENIED",
          message: ACCESS_DENIED_MESSAGE,
        },
      };
    }

    navigationLog("agent.tool.navigation_denied", {
      request_id: requestId ?? undefined,
      reason_code: "internal_error",
    });
    console.error("[suggestAppNavigation]", error);
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong while preparing navigation.",
      },
    };
  }
}
