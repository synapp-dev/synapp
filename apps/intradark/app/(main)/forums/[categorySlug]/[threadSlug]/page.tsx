import Link from "next/link";
import { notFound } from "next/navigation";

import { ForumReplySection } from "@/entities/forums/components/forum-reply-section";
import { ForumThreadDeleteButton } from "@/entities/forums/components/forum-thread-delete-button";
import {
  getForumThreadBySlugs,
  listForumRepliesForThread,
} from "@/entities/forums/lib/queries";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";

type PageProps = {
  params: Promise<{ categorySlug: string; threadSlug: string }>;
};

export default async function ForumThreadPage({ params }: PageProps) {
  const { categorySlug, threadSlug } = await params;
  const [userId, { category, thread }] = await Promise.all([
    getSessionUserId(),
    getForumThreadBySlugs(categorySlug, threadSlug),
  ]);

  if (!category || !thread) notFound();

  const replies = await listForumRepliesForThread(thread.id);
  const isAuthor = userId != null && thread.authorUserId === userId;

  const authorName =
    thread.authorDisplayName?.trim() ||
    thread.authorUsername?.trim() ||
    "Player";

  return (
    <MainSectionShell title={thread.title} description={category.label}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/forums/${category.slug}`}>← {category.label}</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/forums">All categories</Link>
        </Button>
      </div>

      <article className="rounded-lg border p-4 md:p-6">
        <header className="border-b pb-4">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {thread.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {authorName} ·{" "}
            {new Date(thread.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </header>
        <div className="prose prose-invert mt-4 max-w-none">
          <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
            {thread.body}
          </p>
        </div>
        {isAuthor ? (
          <div className="mt-6 flex justify-end border-t pt-4">
            <ForumThreadDeleteButton
              threadId={thread.id}
              categorySlug={category.slug}
            />
          </div>
        ) : null}
      </article>

      <div className="mt-8">
        <ForumReplySection
          threadId={thread.id}
          flatReplies={replies}
          signedIn={Boolean(userId)}
          currentUserId={userId}
        />
      </div>
    </MainSectionShell>
  );
}
