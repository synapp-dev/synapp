import { NewsArticleCard } from "./news-article-card";

type Article = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
};

export function NewsPublicList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12 border border-dashed rounded-lg">
        No articles yet. Check back soon for updates.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {articles.map((a) => (
        <li key={a.slug}>
          <NewsArticleCard
            slug={a.slug}
            title={a.title}
            excerpt={a.excerpt}
            publishedAt={a.publishedAt}
          />
        </li>
      ))}
    </ul>
  );
}
