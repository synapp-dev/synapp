/** Maps a competition to its league badge SVG in /public/images/icons. */
const LEAGUE_ICONS: Record<string, string> = {
  "pug-champions": "/images/icons/champions-league.svg",
  "pug-stellaris": "/images/icons/stellaris-league.svg",
  "pug-genesis": "/images/icons/genesis-league.svg",
};

export function leagueIcon(slug: string): string | null {
  return LEAGUE_ICONS[slug] ?? null;
}
