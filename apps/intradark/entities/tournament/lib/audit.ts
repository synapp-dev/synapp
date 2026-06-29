/** Sensitive organizer action audit trail (plan §7.4). */
import "server-only";

import { db } from "@/server/db/drizzle";
import { competitionAuditLog } from "@/server/db/schema";

export interface AuditEntry {
  competitionId?: string | null;
  seasonId?: string | null;
  actorUserId?: string | null;
  action: string;
  target?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

/** Minimal executor — the shared `db` or a transaction handle from db.transaction. */
type Executor = Pick<typeof db, "insert">;

export async function writeAudit(
  entry: AuditEntry,
  executor: Executor = db,
): Promise<void> {
  await executor.insert(competitionAuditLog).values({
    competitionId: entry.competitionId ?? null,
    seasonId: entry.seasonId ?? null,
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    target: entry.target ?? null,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
    reason: entry.reason ?? null,
  });
}
