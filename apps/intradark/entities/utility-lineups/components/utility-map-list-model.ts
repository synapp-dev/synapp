/** Shared shape for `UtilityMapCard` — utility index rows add pool fields via `UtilityMapListItem`. */
export type UtilityMapCardData = {
  slug: string;
  displayName: string;
  /** Active Duty / Reserved / Community — omit in compact pickers. */
  poolCategory?: string | null;
  badgeImageUrl?: string | null;
  /** Map overview image — card hero when set. */
  mapScreenshotUrl?: string | null;
};

export type UtilityMapListItem = UtilityMapCardData & {
  /** `map_pools.slug` — used to group sections on `/utility`. */
  poolSlug: string;
  /** Required when using pool grouping — same as `UtilityMapPickerOption`. */
  poolCategory: string;
};

/** Map screenshot cards (~30% shorter than prior 7rem baseline). */
export const MAP_CARD_MIN_H = "min-h-[4.9rem]";
/** Full row min-height — was `min-h-40` (10rem); ×0.7 ≈ 7rem. */
export const MAP_CARD_ROW_MIN_H = "min-h-[7rem]";
/** Compact cards (upload wizard picker) — ~30% shorter than prior sm baselines. */
export const MAP_CARD_MIN_H_SM = "min-h-[2.695rem]";
export const MAP_CARD_ROW_MIN_H_SM = "min-h-[3.85rem]";
