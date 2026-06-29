import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { FormatBadge, SeasonStatusBadge } from "@/entities/tournament/components/format-badge";
import Link from "next/link";

import { BracketView } from "@/entities/tournament/components/bracket-view";
import { LadderClient } from "@/entities/tournament/components/ladder-client";
import { LeagueClient } from "@/entities/tournament/components/league-client";
import { PrizesClient } from "@/entities/tournament/components/prizes-client";
import { StandingsTable } from "@/entities/tournament/components/standings-table";
import { isTournamentAdmin } from "@/entities/tournament/lib/guard";
import {
  getCompetitionBySlug,
  getEntrantStandings,
  getFixtures,
  getLadderState,
  getLinkedNews,
  getPlayerStandings,
  getPrizes,
  getSeasonDetail,
} from "@/entities/tournament/lib/queries";

export const dynamic = "force-dynamic";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCompetitionBySlug(slug);
  if (!detail) notFound();

  const { competition, seasons } = detail;
  const currentSeason = seasons[0] ?? null;
  const seasonDetail = currentSeason
    ? await getSeasonDetail(currentSeason.id)
    : null;

  const prize =
    currentSeason?.prizePool && Number(currentSeason.prizePool) > 0
      ? `${currentSeason.prizeCurrency ?? ""} ${Number(
          currentSeason.prizePool,
        ).toLocaleString()}`.trim()
      : null;

  const isLadder = competition.format === "ladder";
  const ladderState =
    currentSeason && isLadder ? await getLadderState(currentSeason.id) : null;

  const userId = await getSessionUserId();
  const canManage = userId ? await isTournamentAdmin(userId) : false;

  const prizes = currentSeason ? await getPrizes(currentSeason.id) : [];
  const linkedNews = currentSeason ? await getLinkedNews(currentSeason.id) : [];

  const ladderStage = seasonDetail?.stages[0];
  const challengeRange =
    (ladderStage?.formatConfig as { challengeRange?: number } | null)?.challengeRange ?? 3;

  const firstStage = seasonDetail?.stages[0];
  const playerStandings =
    firstStage && competition.format === "queue"
      ? await getPlayerStandings(firstStage.id)
      : [];
  const entrantStandings =
    firstStage && competition.format === "league"
      ? await getEntrantStandings(firstStage.id)
      : [];
  const isBracket = competition.format === "bracket";
  const fixtures =
    firstStage && (isBracket || (competition.format === "league" && canManage))
      ? await getFixtures(firstStage.id)
      : [];
  const bracketStandings =
    firstStage && isBracket ? await getEntrantStandings(firstStage.id) : [];

  return (
    <MainSectionShell
      title={competition.name}
      description={competition.description ?? undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FormatBadge format={competition.format} />
        <SeasonStatusBadge status={currentSeason?.status ?? null} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Game mode</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {competition.gameMode}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Prize pool</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {prize ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Stages</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {seasonDetail?.stages.length ?? 0}
          </CardContent>
        </Card>
      </div>

      {isLadder ? (
        <Card>
          <CardHeader>
            <CardTitle>Ladder</CardTitle>
          </CardHeader>
          <CardContent>
            <LadderClient
              stageId={ladderState?.stageId ?? null}
              rows={ladderState?.rows ?? []}
              challenges={ladderState?.challenges ?? []}
              challengeRange={challengeRange}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      ) : competition.format === "queue" ? (
        <Card>
          <CardHeader>
            <CardTitle>Steal points leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <StandingsTable rows={playerStandings} pointsLabel="Steal pts" />
          </CardContent>
        </Card>
      ) : isBracket ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <BracketView fixtures={fixtures} />
            </CardContent>
          </Card>
          {canManage && firstStage ? (
            <Card>
              <CardHeader>
                <CardTitle>Bracket control (admin)</CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueClient stageId={firstStage.id} fixtures={fixtures} />
              </CardContent>
            </Card>
          ) : null}
          {bracketStandings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Final placement</CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsTable rows={bracketStandings} pointsLabel="—" />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : competition.format === "league" ? (
        <>
          {canManage && firstStage ? (
            <Card>
              <CardHeader>
                <CardTitle>Fixtures (admin)</CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueClient stageId={firstStage.id} fixtures={fixtures} />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>League table</CardTitle>
            </CardHeader>
            <CardContent>
              <StandingsTable rows={entrantStandings} pointsLabel="Pts" />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Standings for this format render here as the season runs.
            </p>
          </CardContent>
        </Card>
      )}

      {currentSeason && (prizes.length > 0 || canManage) ? (
        <Card>
          <CardHeader>
            <CardTitle>Prizes</CardTitle>
          </CardHeader>
          <CardContent>
            <PrizesClient
              seasonId={currentSeason.id}
              prizes={prizes}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      ) : null}

      {linkedNews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>News</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {linkedNews.map((n) => (
                <li key={n.slug} className="text-sm">
                  <Link href={`/news/${n.slug}`} className="font-medium hover:underline">
                    {n.title}
                  </Link>
                  <span className="ml-2 text-xs uppercase text-muted-foreground">
                    {n.relationType}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </MainSectionShell>
  );
}
