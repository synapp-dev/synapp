"use server";

import { and, eq } from "drizzle-orm";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { db } from "@/server/db/drizzle";
import { reactions } from "@/server/db/schema";

import {
  isReactionTargetType,
  isReactionType,
  type ReactionTargetType,
  type ReactionType,
} from "../lib/constants";
import { getReactionsForTarget } from "../lib/queries";
import type { ReactionView } from "../lib/types";

export type ToggleReactionResult =
  | { ok: true; reactions: ReactionView[] }
  | { ok: false; message: string };

/**
 * Toggle the viewer's reaction on a target. Clicking the currently-active emoji
 * removes it; a different emoji replaces it; none becomes an insert. Returns the
 * authoritative reaction list so the client can reconcile its optimistic state.
 */
export async function toggleReactionAction(input: {
  targetType: ReactionTargetType;
  targetId: string;
  reactType: ReactionType;
}): Promise<ToggleReactionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, message: "Sign in to react." };
  }

  if (
    !isReactionTargetType(input.targetType) ||
    !isReactionType(input.reactType) ||
    !input.targetId
  ) {
    return { ok: false, message: "Invalid reaction." };
  }

  const { targetType, targetId, reactType } = input;
  const now = new Date().toISOString();

  try {
    const [existing] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.targetType, targetType),
          eq(reactions.targetId, targetId),
          eq(reactions.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.reactType === reactType) {
        // Same emoji → toggle off.
        await db.delete(reactions).where(eq(reactions.id, existing.id));
      } else {
        // Different emoji → replace.
        await db
          .update(reactions)
          .set({ reactType, updatedAt: now })
          .where(eq(reactions.id, existing.id));
      }
    } else {
      await db.insert(reactions).values({
        targetType,
        targetId,
        reactType,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const list = await getReactionsForTarget(targetType, targetId);
    return { ok: true, reactions: list };
  } catch (err) {
    console.error("[reactions] toggleReactionAction", err);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}
