import { and, eq } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { venueReadinessUserState } from "@/server/db/schema";
import type { ReadinessModuleId } from "@/entities/readiness/model/types";

export type ReadinessUserStateRow = {
  dismissedSuggestionKeys: string[];
  seenUnlockModuleIds: string[];
};

const emptyState: ReadinessUserStateRow = {
  dismissedSuggestionKeys: [],
  seenUnlockModuleIds: [],
};

export const readinessUserStateRepo = {
  async get(
    tx: RlsTx,
    args: { userId: string; venueId: string },
  ): Promise<ReadinessUserStateRow> {
    const rows = await tx
      .select({
        dismissedSuggestionKeys: venueReadinessUserState.dismissedSuggestionKeys,
        seenUnlockModuleIds: venueReadinessUserState.seenUnlockModuleIds,
      })
      .from(venueReadinessUserState)
      .where(
        and(
          eq(venueReadinessUserState.userProfileId, args.userId),
          eq(venueReadinessUserState.venueId, args.venueId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return emptyState;
    }

    return {
      dismissedSuggestionKeys: row.dismissedSuggestionKeys ?? [],
      seenUnlockModuleIds: row.seenUnlockModuleIds ?? [],
    };
  },

  async upsertDismissSuggestion(
    tx: RlsTx,
    args: { userId: string; venueId: string; suggestionKey: string },
  ): Promise<ReadinessUserStateRow> {
    const current = await readinessUserStateRepo.get(tx, args);
    if (current.dismissedSuggestionKeys.includes(args.suggestionKey)) {
      return current;
    }

    const dismissedSuggestionKeys = [
      ...current.dismissedSuggestionKeys,
      args.suggestionKey,
    ];
    const now = new Date().toISOString();

    await tx
      .insert(venueReadinessUserState)
      .values({
        userProfileId: args.userId,
        venueId: args.venueId,
        dismissedSuggestionKeys,
        seenUnlockModuleIds: current.seenUnlockModuleIds,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          venueReadinessUserState.userProfileId,
          venueReadinessUserState.venueId,
        ],
        set: {
          dismissedSuggestionKeys,
          updatedAt: now,
        },
      });

    return {
      dismissedSuggestionKeys,
      seenUnlockModuleIds: current.seenUnlockModuleIds,
    };
  },

  async upsertMarkUnlockSeen(
    tx: RlsTx,
    args: { userId: string; venueId: string; moduleId: ReadinessModuleId },
  ): Promise<ReadinessUserStateRow> {
    const current = await readinessUserStateRepo.get(tx, args);
    if (current.seenUnlockModuleIds.includes(args.moduleId)) {
      return current;
    }

    const seenUnlockModuleIds = [...current.seenUnlockModuleIds, args.moduleId];
    const now = new Date().toISOString();

    await tx
      .insert(venueReadinessUserState)
      .values({
        userProfileId: args.userId,
        venueId: args.venueId,
        dismissedSuggestionKeys: current.dismissedSuggestionKeys,
        seenUnlockModuleIds,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          venueReadinessUserState.userProfileId,
          venueReadinessUserState.venueId,
        ],
        set: {
          seenUnlockModuleIds,
          updatedAt: now,
        },
      });

    return {
      dismissedSuggestionKeys: current.dismissedSuggestionKeys,
      seenUnlockModuleIds,
    };
  },
};
