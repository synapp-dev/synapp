import Link from "next/link";
import { notFound } from "next/navigation";

import { ForumThreadList } from "@/entities/forums/components/forum-thread-list";
import {
  getForumCategoryBySlug,
  listForumThreadsForCategory,
} from "@/entities/forums/lib/queries";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";

type PageProps = { params: Promise<{ categorySlug: string }> };

export default async function ForumCategoryPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const category = await getForumCategoryBySlug(categorySlug);
  if (!category) notFound();

  const [threads, userId] = await Promise.all([
    listForumThreadsForCategory(category.id),
    getSessionUserId(),
  ]);

  return (
    <MainSectionShell
      title={category.label}
      description={category.description ?? "Threads in this category."}
    >
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/forums">← All categories</Link>
        </Button>
      </div>
      <ForumThreadList
        categorySlug={category.slug}
        threads={threads}
        signedIn={Boolean(userId)}
      />
    </MainSectionShell>
  );
}
