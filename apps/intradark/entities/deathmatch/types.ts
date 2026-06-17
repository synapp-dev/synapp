/** Serializable leaderboard row shape — shared by the server query, the server
 *  action, and the client table (no server-only imports, safe in the browser). */
export type DeathmatchRow = {
  steamid64: string | null;
  personaname: string | null;
  avatarfull: string | null;
  countryFlag: string | null;
  isTracked: boolean | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  headshotKills: number | null;
  kd: string | null;
  hsPct: string | null;
};
