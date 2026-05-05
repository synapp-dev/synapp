import Link from "next/link";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { CreateNewsArticleForm } from "@/entities/news/components/create-news-article-form";
import { Button } from "@workspace/ui/components/button";

export default function NewsAdminNewPage() {
  return (
    <MainSectionShell
      title="New article"
      description="Creates a draft you can edit before publishing."
    >
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/news/admin">← All articles</Link>
        </Button>
      </div>
      <CreateNewsArticleForm />
    </MainSectionShell>
  );
}
