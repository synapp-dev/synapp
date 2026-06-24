import { notFound } from "next/navigation";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { NewsEditorShell } from "@/entities/news/components/news-editor-shell";
import { getArticleByIdForAdmin } from "@/entities/news/lib/queries";

export default async function NewsAdminEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleByIdForAdmin(id);
  if (!article) {
    notFound();
  }

  return (
    <MainSectionShell
      title="Edit article"
      description="Manual save only. Publish when ready for the public list."
    >
      <NewsEditorShell
        articleId={article.id}
        initialTitle={article.title}
        initialSlug={article.slug}
        initialExcerpt={article.excerpt}
        initialCoverImageUrl={article.coverImageUrl}
        initialBody={article.bodyJson}
        initialStatus={article.status as "draft" | "published"}
      />
    </MainSectionShell>
  );
}
