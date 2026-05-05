import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ForumNewThreadForm } from "@/entities/forums/components/forum-new-thread-form";
import {
  getForumCategoryBySlug,
  listForumTags,
} from "@/entities/forums/lib/queries";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";

type PageProps = { params: Promise<{ categorySlug: string }> };

export default async function ForumNewThreadPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    redirect(
      `/auth?returnTo=${encodeURIComponent(`/forums/${categorySlug}/new`)}`,
    );
  }

  const category = await getForumCategoryBySlug(categorySlug);
  if (!category) notFound();

  const tags = await listForumTags();

  return (
    <MainSectionShell
      title="New thread"
      description={`Posting in ${category.label}`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/forums/${category.slug}`}>← Back</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/forums">All categories</Link>
        </Button>
      </div>
      <ForumNewThreadForm categorySlug={category.slug} tags={tags} />
    </MainSectionShell>
  );
}
