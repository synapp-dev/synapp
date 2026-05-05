import { format } from "date-fns";
import { notFound } from "next/navigation";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { NewsArticleBodyHtml } from "@/entities/news/components/news-article-body-html";
import { getPublishedArticleBySlug } from "@/entities/news/lib/queries";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const publishedLabel = article.publishedAt
    ? format(new Date(article.publishedAt), "MMMM d, yyyy")
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl font-[Georgia,Times_New_Roman,serif]">
      <MainSectionShell title={article.title} description={publishedLabel}>
        {article.excerpt ? (
          <p className="text-lg text-muted-foreground -mt-2 mb-8">
            {article.excerpt}
          </p>
        ) : null}
        <NewsArticleBodyHtml doc={article.bodyJson} />
      </MainSectionShell>
    </div>
  );
}
