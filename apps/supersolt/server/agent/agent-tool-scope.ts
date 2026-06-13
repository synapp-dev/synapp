import type { AgentChatAccessContext } from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";
import type { RequestAuthContext } from "@/server/auth/context";
import { assertVenueMember } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";
import { scopeRepo, type VenueScope } from "@/server/db/scope.repo";
import type { AppDb } from "@/server/db/create-app-db";

function agentScopeLog(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...payload }));
}

export type AgentVenueAccessDenied = {
  denied: true;
  reason: "venue_not_found" | "access_denied";
};

export async function loadAgentAccessContext(args: {
  appDb: AppDb;
  userId: string;
  requestId?: string | null;
}): Promise<{ organisations: AgentChatAccessContext["organisations"] }> {
  agentScopeLog("agent.tool.access_context_started", {
    request_id: args.requestId ?? undefined,
  });

  const result = await loadAccessContextForUser(args.appDb, args.userId);
  if (result.error) {
    agentScopeLog("agent.tool.access_context_finished", {
      request_id: args.requestId ?? undefined,
      org_count: 0,
      venue_count: 0,
      error: true,
    });
    throw new Error(result.error.message);
  }

  const orgs = result.data.organisations;
  const venueCount = orgs.reduce((n, o) => n + o.venues.length, 0);
  agentScopeLog("agent.tool.access_context_finished", {
    request_id: args.requestId ?? undefined,
    org_count: orgs.length,
    venue_count: venueCount,
  });

  return { organisations: orgs };
}

export async function resolveAgentVenueScopeForNavigation(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
): Promise<VenueScope | AgentVenueAccessDenied> {
  const venueContext = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisationSlug, venueSlug),
  );

  if (!venueContext) {
    return { denied: true, reason: "venue_not_found" };
  }

  try {
    assertVenueMember(ctx.tenantRoles, {
      organisationId: venueContext.organisationId,
      venueId: venueContext.venueId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { denied: true, reason: "access_denied" };
    }
    throw error;
  }

  return venueContext;
}
