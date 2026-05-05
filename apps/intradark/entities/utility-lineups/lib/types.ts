export const UTILITY_GRENADE_TYPES = [
  "smoke",
  "molotov",
  "flashbang",
  "he",
] as const;

export type UtilityGrenadeType = (typeof UTILITY_GRENADE_TYPES)[number];

export type UtilityGrenadeFilter = "all" | UtilityGrenadeType;

export type UtilitySideFilter = "any" | "t" | "ct";

export type UtilitySearchFilters = {
  grenadeType: UtilityGrenadeFilter;
  side: UtilitySideFilter;
};
