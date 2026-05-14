/** Ms step for timeline scrubbers and Zod markers */
export const UTILITY_LINEUP_MS_STEP = 100;

export function snapUtilityLineupMs(ms: number): number {
  return Math.round(ms / UTILITY_LINEUP_MS_STEP) * UTILITY_LINEUP_MS_STEP;
}
