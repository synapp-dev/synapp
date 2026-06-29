import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ForumReplySection } from "@/entities/forums/components/forum-reply-section";
import { ForumThreadDeleteButton } from "@/entities/forums/components/forum-thread-delete-button";
import {
  getForumThreadBySlugs,
  listForumRepliesForThread,
} from "@/entities/forums/lib/queries";
import {
  getReactionsForTarget,
  getReactionsForTargets,
} from "@/entities/reactions/lib/queries";
import { ReactionBar } from "@/entities/reactions/components/reaction-bar";
import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import { viewerAuthorFromProfiles } from "@/entities/reactions/lib/viewer";
import type { ReactionAuthor } from "@/entities/reactions/lib/types";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";

type PageProps = {
  params: Promise<{ categorySlug: string; threadSlug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({ params }: PageProps) {
  await connection();
  const { categorySlug, threadSlug } = await params;
  const [userId, viewer, { category, thread }] = await Promise.all([
    getSessionUserId(),
    getCurrentUserProfiles(),
    getForumThreadBySlugs(categorySlug, threadSlug),
  ]);

  if (!category || !thread) notFound();

  const replies = await listForumRepliesForThread(thread.id);
  const isAuthor = userId != null && thread.authorUserId === userId;

  const replyIds = replies.map((r) => r.id);
  const [reactionsMap, threadReactions] = await Promise.all([
    getReactionsForTargets("forum_reply", replyIds),
    getReactionsForTarget("forum_thread", thread.id),
  ]);
  const reactionsByReply = Object.fromEntries(reactionsMap);
  const viewerAuthor = viewerAuthorFromProfiles(viewer);

  const authorName =
    thread.authorDisplayName?.trim() ||
    thread.authorUsername?.trim() ||
    "Player";

  const threadAuthor: ReactionAuthor = {
    userId: thread.authorUserId,
    username: thread.authorUsername,
    displayName: thread.authorDisplayName,
    avatarUrl: thread.authorAvatar,
    countryFlag: thread.authorCountryFlag,
    steamid64: thread.authorSteamid64,
  };

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
            <UserHoverCard author={threadAuthor}>
              <span className="animated-underline-1 cursor-default font-medium text-muted-foreground transition-colors hover:text-foreground">
                {authorName}
              </span>
            </UserHoverCard>{" "}
            ·{" "}
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
        <div className="mt-4">
          <ReactionBar
            size="md"
            targetType="forum_thread"
            targetId={thread.id}
            initialReactions={threadReactions}
            viewerUserId={userId}
            viewerAuthor={viewerAuthor}
            canReact={Boolean(userId)}
            emptyPrompt="React to this thread!"
          />
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
          reactionsByReply={reactionsByReply}
          viewerAuthor={viewerAuthor}
        />
      </div>
    </MainSectionShell>
  );
}
