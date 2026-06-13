import type { AgentChatAccessContext } from "@/entities/ai-agent-chat/lib/agent-chat-access-context-schema";
import { loadAgentAccessContext } from "@/server/agent/agent-tool-scope";
import type { AppDb } from "@/server/db/create-app-db";

export async function executeListAccessibleTenants(args: {
  appDb: AppDb;
  userId: string;
  requestId?: string | null;
}): Promise<{ organisations: AgentChatAccessContext["organisations"] }> {
  return loadAgentAccessContext(args);
}
