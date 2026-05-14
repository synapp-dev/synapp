import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  type AgentChatAccessContext,
  focusPairExistsInAccessContext,
  parseFocusSlugs,
  parseOptionalAgentChatAccessContext,
} from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";
import {
  buildPageContextSystemAppend,
  parseAgentChatPageContextFromBody,
} from "@/entities/ai-agent-chat/lib/agent-chat-page-context-schema";
import { APP_NAVIGATION_DESTINATION_KEYS } from "@/entities/ai-agent-chat/lib/app-navigation-catalog";
import { suggestAppNavigationInputSchema } from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";
import { createServerClient } from "@/utils/supabase/server";

import { buildTenantScopeSystemAppend } from "./build-tenant-scope-system-append";
import { executeListAccessibleTenants } from "./execute-list-accessible-tenants";
import { executeSuggestAppNavigation } from "./execute-suggest-app-navigation";

export const maxDuration = 60;

function createAgentTools(context: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  requestId?: string | null;
}) {
  return {
    getServerTime: tool({
      description:
        "Returns the current server time in ISO 8601 UTC. Use for smoke-testing tools and inline UI.",
      inputSchema: z.object({}),
      execute: async () => ({
        iso: new Date().toISOString(),
      }),
    }),
    listAccessibleTenants: tool({
      description:
        "Returns all organisations and venues the signed-in user may access (slug, name, nested venues). " +
        "Use when you need a fresh server-side list or the access context in the system message is missing or unclear. " +
        "Read-only; does not change permissions.",
      inputSchema: z.object({}),
      execute: async () =>
        executeListAccessibleTenants({
          supabase: context.supabase,
          userId: context.userId,
          requestId: context.requestId,
        }),
    }),
    suggestAppNavigation: tool({
      description:
        "Returns in-app navigation cards for catalog destinations the user can open in Supersolt. " +
        "Call this when the user asks to go to a screen (for example Ingredients) for a specific organisation and venue. " +
        "You must pass the organisation slug and venue slug exactly as used in the app URL (for example /my-org/my-venue/...). " +
        "Only use destination keys from the allowed list; never invent URLs or paths.",
      inputSchema: suggestAppNavigationInputSchema,
      execute: async (input) =>
        executeSuggestAppNavigation({
          supabase: context.supabase,
          userId: context.userId,
          rawInput: input,
          requestId: context.requestId,
        }),
    }),
  };
}

async function resolveAccessContextForPrompt(args: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  requestId: string | undefined;
  body: Record<string, unknown>;
}): Promise<{ access: AgentChatAccessContext; source: "client_snapshot" | "server_load" }> {
  const parsedSnapshot = parseOptionalAgentChatAccessContext(args.body.accessContext);
  if (parsedSnapshot.ok) {
    console.info(
      JSON.stringify({
        event: "agent.chat.access_context_injected",
        request_id: args.requestId,
        org_count: parsedSnapshot.value.organisations.length,
        venue_count: parsedSnapshot.value.organisations.reduce(
          (n, o) => n + o.venues.length,
          0
        ),
      })
    );
    return { access: parsedSnapshot.value, source: "client_snapshot" };
  }

  const server = await loadAccessContextForUser(args.supabase, args.userId);
  if (server.error) {
    throw new Error(server.error.message);
  }
  const access: AgentChatAccessContext = { organisations: server.data.organisations };
  console.info(
    JSON.stringify({
      event: "agent.chat.access_context_server_load",
      request_id: args.requestId,
      org_count: access.organisations.length,
      venue_count: access.organisations.reduce((n, o) => n + o.venues.length, 0),
    })
  );
  return { access, source: "server_load" };
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body || typeof body !== "object" || !("messages" in body)) {
    return new Response("Expected JSON body with messages", { status: 400 });
  }

  const bodyObj = body as Record<string, unknown>;
  const { messages, requestId } = bodyObj as {
    messages: UIMessage[];
    requestId?: string;
  };
  if (!Array.isArray(messages) || messages.length > 100) {
    return new Response("Invalid messages", { status: 400 });
  }

  const safeRequestId =
    typeof requestId === "string" && requestId.length > 0 && requestId.length <= 128
      ? requestId
      : undefined;

  const { organisationSlug: focusOrganisationSlug, venueSlug: focusVenueSlug } =
    parseFocusSlugs(bodyObj);

  let accessForPrompt: AgentChatAccessContext;
  let contextSource: "client_snapshot" | "server_load";
  try {
    const resolved = await resolveAccessContextForPrompt({
      supabase,
      userId: user.id,
      requestId: safeRequestId,
      body: bodyObj,
    });
    accessForPrompt = resolved.access;
    contextSource = resolved.source;
  } catch (e) {
    console.error("[agent/chat] access context", e);
    return new Response("Could not load access context", { status: 500 });
  }

  let validatedFocusOrg = focusOrganisationSlug;
  let validatedFocusVenue = focusVenueSlug;
  if (
    validatedFocusOrg &&
    validatedFocusVenue &&
    !focusPairExistsInAccessContext(
      accessForPrompt,
      validatedFocusOrg,
      validatedFocusVenue
    )
  ) {
    validatedFocusOrg = undefined;
    validatedFocusVenue = undefined;
  }

  const tenantScopeAppend = buildTenantScopeSystemAppend({
    accessForPrompt,
    contextSource,
    focusOrganisationSlug: validatedFocusOrg,
    focusVenueSlug: validatedFocusVenue,
  });

  const pageContext = parseAgentChatPageContextFromBody(bodyObj);
  const pageContextAppend = buildPageContextSystemAppend(pageContext);
  if (pageContextAppend) {
    console.info(
      JSON.stringify({
        event: "agent.chat.page_context",
        request_id: safeRequestId,
        has_pathname: Boolean(pageContext.pathname),
        has_page_label: Boolean(pageContext.pageLabel),
      }),
    );
  }

  const agentTools = createAgentTools({
    supabase,
    userId: user.id,
    requestId: safeRequestId,
  });

  const result = streamText({
    model: openai("gpt-5.4-mini"),
    stopWhen: stepCountIs(8),
    system: [
      "You are Supersolt Agent, a concise assistant for hospitality operators.",
      "The user may work across multiple organisations and venues they have access to.",
      "When they ask for the time or a connectivity check, call getServerTime once.",
      "When they want to open a part of the app for a named organisation and venue, " +
        "call suggestAppNavigation with organisationSlug, venueSlug, and destinationKeys. " +
        `Allowed destinationKeys values (match user language to the closest; up to 8 per call): ${APP_NAVIGATION_DESTINATION_KEYS.join(", ")}.`,
      "After suggestAppNavigation returns one or more navigation cards, do not repeat destinations in prose, bullet lists, or long summaries—the UI already shows the cards and short on-screen guidance.",
      "Otherwise answer helpfully in plain language; do not invent data about venues or sales.",
      tenantScopeAppend,
      pageContextAppend,
    ]
      .filter((s): s is string => Boolean(s && s.length > 0))
      .join("\n\n"),
    messages: await convertToModelMessages(messages),
    tools: agentTools,
  });

  return result.toUIMessageStreamResponse();
}
