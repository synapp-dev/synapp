import type { AgentChatAccessContext } from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";
import {
  focusPairExistsInAccessContext,
  parseFocusSlugs,
  parseOptionalAgentChatAccessContext,
} from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";

export function buildTenantScopeSystemAppend(args: {
  accessForPrompt: AgentChatAccessContext;
  contextSource: "client_snapshot" | "server_load";
  focusOrganisationSlug?: string;
  focusVenueSlug?: string;
}): string {
  const parts: string[] = [
    `Tenant access context (${args.contextSource}, JSON; for disambiguation only—tenant tools re-validate membership on the server):`,
    JSON.stringify(args.accessForPrompt),
  ];

  if (
    args.focusOrganisationSlug &&
    args.focusVenueSlug &&
    focusPairExistsInAccessContext(
      args.accessForPrompt,
      args.focusOrganisationSlug,
      args.focusVenueSlug
    )
  ) {
    parts.push(
      `Current scope from the app shell: organisationSlug="${args.focusOrganisationSlug}", venueSlug="${args.focusVenueSlug}". Prefer these when calling suggestAppNavigation unless the user clearly chose a different venue in this thread.`
    );
  }

  parts.push(
    "When the user asks to open an in-app destination (e.g. roster, sales, ingredients, purchase orders), call suggestAppNavigation with organisationSlug, venueSlug, and destinationKeys (snake_case keys such as workforce_roster, insights_sales, ingredients, inventory_purchase_orders). Do not invent slugs—use focus slugs or names from the access context, or call listAccessibleTenants if you need a fresh server list."
  );

  return parts.join("\n");
}
