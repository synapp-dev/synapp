import { CompetitionTable } from "@/entities/tournament/components/competition-table";
import { LeagueHeroCarousel } from "@/entities/tournament/components/league-hero-carousel";
import {
  listCompetitions,
  listFeaturedLeagues,
} from "@/entities/tournament/lib/queries";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const [competitions, featured] = await Promise.all([
    listCompetitions(),
    listFeaturedLeagues(),
  ]);

  const others = competitions.filter((c) => c.format !== "queue");

  if (competitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No competitions yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {featured.length > 0 ? (
        // Break out of the page's px-6 padding for a full-bleed hero.
        <div className="-mx-6">
          <LeagueHeroCarousel leagues={featured} />
        </div>
      ) : null}

      {others.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Leagues &amp; Ladders
          </h2>
          <CompetitionTable competitions={others} />
        </section>
      ) : null}
    </div>
  );
}
