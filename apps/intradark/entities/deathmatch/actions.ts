"use server";

import { getDeathmatchLeaderboard } from "./lib/queries";
import type { DeathmatchRow } from "./types";

/** Server action: re-fetch the leaderboard for the live client table. */
export async function fetchDeathmatchLeaderboard(): Promise<DeathmatchRow[]> {
  return getDeathmatchLeaderboard();
}
