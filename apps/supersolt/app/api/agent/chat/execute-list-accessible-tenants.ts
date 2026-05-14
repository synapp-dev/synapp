import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentChatAccessContext } from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

function navigationLog(
  event: "agent.tool.access_context_started" | "agent.tool.access_context_finished",
  payload: Record<string, unknown>
) {
  console.info(JSON.stringify({ event, ...payload }));
}

export async function executeListAccessibleTenants(args: {
  supabase: Supabase;
  userId: string;
  requestId?: string | null;
}): Promise<{ organisations: AgentChatAccessContext["organisations"] }> {
  navigationLog("agent.tool.access_context_started", {
    request_id: args.requestId ?? undefined,
  });

  const result = await loadAccessContextForUser(args.supabase, args.userId);
  if (result.error) {
    navigationLog("agent.tool.access_context_finished", {
      request_id: args.requestId ?? undefined,
      org_count: 0,
      venue_count: 0,
      error: true,
    });
    throw new Error(result.error.message);
  }

  const orgs = result.data.organisations;
  const venueCount = orgs.reduce((n, o) => n + o.venues.length, 0);
  navigationLog("agent.tool.access_context_finished", {
    request_id: args.requestId ?? undefined,
    org_count: orgs.length,
    venue_count: venueCount,
  });

  return { organisations: orgs };
}
