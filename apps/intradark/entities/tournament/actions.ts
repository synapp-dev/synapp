"use server";

import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";

import { isTournamentAdmin } from "./lib/guard";
import {
  createCompetitionSchema,
  registerEntrantSchema,
  updateSeasonStatusSchema,
} from "./lib/schemas";
import {
  createCompetition,
  registerEntrant,
  updateSeasonStatus,
} from "./lib/service";

export type TournamentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: "FORBIDDEN" | "INVALID" | "CONFLICT" | "ERROR"; message: string };

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; code: "FORBIDDEN"; message: string }
> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, code: "FORBIDDEN", message: "Sign in required." };
  if (!(await isTournamentAdmin(userId))) {
    return { ok: false, code: "FORBIDDEN", message: "Tournament admin role required." };
  }
  return { ok: true, userId };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function createCompetitionAction(
  input: unknown,
): Promise<TournamentActionResult<{ slug: string; competitionId: string; seasonId: string }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = createCompetitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const created = await createCompetition(parsed.data, gate.userId);
    revalidatePath("/admin/tournaments");
    revalidatePath("/tournaments");
    return {
      ok: true,
      data: {
        slug: created.slug,
        competitionId: created.competitionId,
        seasonId: created.seasonId,
      },
    };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, code: "CONFLICT", message: "That slug is already taken." };
    }
    return { ok: false, code: "ERROR", message: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateSeasonStatusAction(
  input: unknown,
): Promise<TournamentActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = updateSeasonStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await updateSeasonStatus(parsed.data, gate.userId);
    revalidatePath("/admin/tournaments");
    revalidatePath("/tournaments");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "ERROR", message: err instanceof Error ? err.message : "Failed" };
  }
}

export async function registerEntrantAction(
  input: unknown,
): Promise<TournamentActionResult<{ entrantId: string }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = registerEntrantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const result = await registerEntrant(parsed.data, gate.userId);
    revalidatePath("/tournaments");
    return { ok: true, data: result };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, code: "CONFLICT", message: "A player is already entered in this season." };
    }
    return { ok: false, code: "ERROR", message: err instanceof Error ? err.message : "Failed" };
  }
}
