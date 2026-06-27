/** Skill tier (Tier 1 = highest; lower `rank` = stronger). */
export type Tier = {
  id: string;
  rank: number;
  slug: string;
  name: string;
  /** Hex without leading `#`, e.g. `eab308`. */
  color: string | null;
  logo: string | null;
};

export type ScrimRegion = {
  id: string;
  slug: string;
  name: string;
  /** IANA timezone, e.g. `Australia/Sydney`. */
  timezone: string;
};

export type ScrimMap = {
  id: string;
  slug: string;
  name: string;
  badge: string | null;
  screenshot: string | null;
};

/** A team the viewer can act as, with its scrim tier + region. */
export type ScrimTeam = {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tierId: string | null;
  regionId: string | null;
};

/** Everything the scrim UI needs up front (passed from the server layout). */
export type ScrimBootstrap = {
  myTeams: ScrimTeam[];
  tiers: Tier[];
  regions: ScrimRegion[];
  maps: ScrimMap[];
};

/** A team reference embedded in a listing/scrim row. */
export type ScrimTeamRef = {
  id: string;
  name: string;
  avatar: string | null;
  tierId: string | null;
};

/** Confirmed scrim match with both teams + the played map. */
export type ScrimDetail = {
  id: string;
  matchTime: string;
  active: boolean;
  scrimCancelId: string | null;
  homeTeam: ScrimTeamRef;
  awayTeam: ScrimTeamRef;
  map: ScrimMap | null;
};

/** A team's manual server connect details. */
export type TeamServer = {
  id: string;
  teamId: string;
  label: string | null;
  ip: string;
  port: number;
  password: string | null;
  status: string;
};
