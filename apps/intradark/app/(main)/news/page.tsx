import { listRecentForumThreads } from "@/entities/forums/lib/queries";
import { ForumRecentWidget } from "@/entities/forums/components/forum-recent-widget";
import { NewsFeaturedHero } from "@/entities/news/components/news-featured-hero";
import { NewsSectionHeader } from "@/entities/news/components/news-section-header";
import { NewsStoryCard } from "@/entities/news/components/news-story-card";
import { NewsTagFilter } from "@/entities/news/components/news-tag-filter";
import {
  getTagsForArticleIds,
  listNewsTags,
  listPublishedNewsArticles,
} from "@/entities/news/lib/queries";
import { MediaClipsWidget } from "@/entities/utility-lineups/components/media-clips-widget";
import { listRecentUtilityClips } from "@/entities/utility-lineups/lib/queries";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: activeTag } = await searchParams;

  const [rows, allTags, threads, clips] = await Promise.all([
    listPublishedNewsArticles(),
    listNewsTags(),
    listRecentForumThreads(5),
    listRecentUtilityClips(4),
  ]);

  const published = rows.filter((a) => a.publishedAt != null);
  const tagsByArticle = await getTagsForArticleIds(published.map((a) => a.id));

  const articles = published
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      coverImageUrl: a.coverImageUrl,
      publishedAt: a.publishedAt as string,
      tags: tagsByArticle.get(a.id) ?? [],
    }))
    .filter((a) =>
      activeTag ? a.tags.some((t) => t.slug === activeTag) : true,
    );

  const [featured, ...rest] = articles;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold">News</h1>
          <p className="text-muted-foreground mt-1">
            Announcements, updates, and stories from the community.
          </p>
        </div>
        <NewsTagFilter tags={allTags} active={activeTag} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main column: lead story + grid */}
        <div className="space-y-8 lg:col-span-2">
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
            <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center">
              {activeTag
                ? "No articles with this tag yet."
                : "No articles yet. Check back soon for updates."}
            </div>
          )}

          {rest.length > 0 ? (
            <section>
              <NewsSectionHeader title="Latest stories" />
              <div className="grid gap-4 sm:grid-cols-2">
                {rest.map((a) => (
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
            </section>
          ) : null}
        </div>

        {/* Right rail: forum + media widgets */}
        <aside className="space-y-8">
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
