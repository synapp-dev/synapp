import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { NewsPublicList } from "@/entities/news/components/news-public-list";
import { listPublishedNewsArticles } from "@/entities/news/lib/queries";

export default async function NewsPage() {
  const rows = await listPublishedNewsArticles();
  const articles = rows
    .filter((a) => a.publishedAt != null)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      publishedAt: a.publishedAt as string,
    }));

  return (
    <MainSectionShell
      title="News"
      description="Updates, patch notes, and community announcements."
    >
      <NewsPublicList articles={articles} />
    </MainSectionShell>
  );
}
