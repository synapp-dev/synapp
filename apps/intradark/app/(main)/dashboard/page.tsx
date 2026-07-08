import Image from "next/image";
import Link from "next/link";
import { Gamepad2, Swords } from "lucide-react";

import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

import { EmptyState } from "@/components/atoms/empty-state";
import { DiscordLinkDialog } from "@/components/molecules/discord-link-dialog";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

import { resolvePlayerIdentifier } from "@/entities/players/lib/server/resolve-server";
import { getPlayerTeamForProfile } from "@/entities/teams/lib/queries";
import { DashboardPlayerHero } from "@/entities/players/components/dashboard-player-hero";

import { getMyScrimTeams, getNextScrimForTeams } from "@/entities/scrims/lib/queries";
import { NextScrimWidget } from "@/entities/scrims/components/next-scrim-widget";

import {
  getTagsForArticleIds,
  listPublishedNewsArticles,
} from "@/entities/news/lib/queries";
import { NewsFeaturedHero } from "@/entities/news/components/news-featured-hero";
import { NewsSectionHeader } from "@/entities/news/components/news-section-header";
import { NewsStoryCard } from "@/entities/news/components/news-story-card";

import { listRecentForumThreads } from "@/entities/forums/lib/queries";
import { ForumRecentWidget } from "@/entities/forums/components/forum-recent-widget";

import { listRecentUtilityClips } from "@/entities/utility-lineups/lib/queries";
import { MediaClipsWidget } from "@/entities/utility-lineups/components/media-clips-widget";

import { getDeathmatchLeaderboard } from "@/entities/deathmatch/lib/queries";
import { LeaderboardSnippet } from "@/entities/deathmatch/components/leaderboard-snippet";

export const dynamic = "force-dynamic";

function SignInPrompt() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Sign in with Steam to view your profile and stats.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            You are not signed in. Sign in with Steam to continue.
          </p>
          <Button asChild>
            <a href="/api/auth/steam" className="inline-flex items-center gap-2">
              <Image
                src="/images/logos/steam-logo-white.svg"
                alt="Steam"
                width={20}
                height={20}
              />
              Sign in with Steam
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Quick-launch card for the PUG queue. */
function PlayCtaCard() {
  return (
    <Link
      href="/play"
      className="group bg-card focus-visible:ring-ring relative block overflow-hidden rounded-xl border p-5 transition-colors hover:border-primary/50 focus-visible:ring-1 focus-visible:outline-none"
    >
      <div className="bg-primary/10 absolute -right-8 -top-8 size-28 rounded-full blur-2xl transition-opacity group-hover:opacity-80" />
      <div className="relative flex items-center gap-4">
        <div className="bg-primary/15 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
          <Swords className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Jump into a PUG</p>
          <p className="text-muted-foreground text-sm">
            Queue up and get matched into a 5v5.
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const profiles = await getCurrentUserProfiles();

  if (!profiles) {
    return <SignInPrompt />;
  }

  const { userProfile } = profiles;
  const steamid64 = userProfile.steam_profile_id;
  const nowIso = new Date().toISOString();

  const needsDiscordLink = userProfile.discord_user_id == null;

  // Hero (per-viewer) + public content widgets, all in parallel.
  const [resolved, team, myTeams, newsRows, threads, clips, leaderboard] =
    await Promise.all([
      steamid64 ? resolvePlayerIdentifier(steamid64) : Promise.resolve(null),
      steamid64 ? getPlayerTeamForProfile(steamid64) : Promise.resolve(null),
      steamid64 ? getMyScrimTeams(steamid64) : Promise.resolve([]),
      listPublishedNewsArticles(),
      listRecentForumThreads(5),
      listRecentUtilityClips(4),
      getDeathmatchLeaderboard(5),
    ]);

  const myTeamIds = myTeams.map((t) => t.id);
  const nextScrim = await getNextScrimForTeams(myTeamIds, nowIso);

  const published = newsRows.filter((a) => a.publishedAt != null);
  const tagsByArticle = await getTagsForArticleIds(published.map((a) => a.id));
  const articles = published.map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    publishedAt: a.publishedAt as string,
    tags: tagsByArticle.get(a.id) ?? [],
  }));
  const [featured, ...restArticles] = articles;
  const sideStories = restArticles.slice(0, 2);

  return (
    <div className="space-y-8">
      <DiscordLinkDialog needsDiscordLink={needsDiscordLink} />

      {steamid64 ? (
        <DashboardPlayerHero
          steamid64={steamid64}
          linkedUsername={resolved?.linkedUsername ?? userProfile.username}
          fullName={resolved?.fullName ?? null}
          countryFlag={resolved?.countryFlag ?? null}
          anthemUrl={resolved?.anthemUrl ?? null}
          socialLinks={resolved?.socialLinks}
          team={team?.team ?? null}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Gamepad2 className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Link your Steam account</p>
              <p className="text-muted-foreground text-sm">
                Connect Steam to unlock your player card and stats.
              </p>
            </div>
            <Button asChild>
              <a href="/api/auth/steam">Link Steam</a>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main column: news */}
        <div className="space-y-8 lg:col-span-2">
          <section>
            <NewsSectionHeader title="Latest news" viewAllHref="/news" />
            {featured ? (
              <NewsFeaturedHero
                slug={featured.slug}
                title={featured.title}
                excerpt={featured.excerpt}
                coverImageUrl={featured.coverImageUrl}
                publishedAt={featured.publishedAt}
                tags={featured.tags}
              />
            ) : (
              <EmptyState>
                No articles yet. Check back soon for updates.
              </EmptyState>
            )}

            {sideStories.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {sideStories.map((a) => (
                  <NewsStoryCard
                    key={a.slug}
                    slug={a.slug}
                    title={a.title}
                    excerpt={a.excerpt}
                    coverImageUrl={a.coverImageUrl}
                    publishedAt={a.publishedAt}
                    tags={a.tags}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        {/* Right rail: scrim, play, forum, clips */}
        <aside className="space-y-8">
          <section>
            <NewsSectionHeader title="Next scrim" viewAllHref="/scrims" />
            {nextScrim ? (
              <NextScrimWidget scrim={nextScrim} myTeamIds={myTeamIds} />
            ) : (
              <EmptyState>
                No upcoming scrims.{" "}
                <Link href="/scrims" className="text-primary hover:underline">
                  Book one
                </Link>
                .
              </EmptyState>
            )}
          </section>

          <PlayCtaCard />

          <section>
            <NewsSectionHeader
              title="Top fraggers"
              viewAllHref="/leaderboards/deathmatch"
            />
            <LeaderboardSnippet rows={leaderboard} />
          </section>

          <section>
            <NewsSectionHeader title="Forum activity" viewAllHref="/forums" />
            <ForumRecentWidget threads={threads} />
          </section>

          <section>
            <NewsSectionHeader title="Latest clips" viewAllHref="/utility" />
            <MediaClipsWidget clips={clips} />
          </section>
        </aside>
      </div>
    </div>
  );
}
