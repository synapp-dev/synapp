export type UtilityClientLineup = {
  id: string;
  grenadeType: string;
  side: string;
  movement: string;
  technique: string;
  margin: string;
  description: string;
  youtubeUrl: string | null;
  videoObjectPath: string | null;
  videoStartMs: number;
  videoEndMs: number | null;
  stillStandMs: number | null;
  stillThrowMs: number | null;
  stillLandMs: number | null;
  grenadeReleaseMs: number | null;
  grenadeBloomMs: number | null;
  lineupImageUrl: string | null;
  setposText: string | null;
  /** Normalized 0–1 on radar art */
  throwSpotX: number;
  throwSpotY: number;
  landSpotX: number;
  landSpotY: number;
  throwLabel: string;
  landLabel: string;
  intradarkVerified: boolean;
  proVerified: boolean;
  /** Author display name or username when `author_profile_id` is set. */
  uploadAuthorAlias: string | null;
  uploadAuthorAvatarUrl: string | null;
};

export type UtilityClientCluster = {
  clusterKey: string;
  count: number;
  lineupIds: string[];
  radarX: number;
  radarY: number;
  label: string;
  /** Nearby land pins merged → use combined T/CT smoke art */
  combineSidesVisual?: boolean;
};
