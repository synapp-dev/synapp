"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  Send,
  Smile,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { ReactionBar } from "@/entities/reactions/components/reaction-bar";
import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import type {
  ReactionAuthor,
  ReactionView,
} from "@/entities/reactions/lib/types";

import {
  createNewsCommentAction,
  deleteNewsCommentAction,
  loadMoreNewsCommentsAction,
  updateNewsCommentAction,
} from "@/entities/news/actions/news-comments-actions";
import type { NewsCommentTreeNode } from "@/entities/news/lib/comments/build-comment-tree";
import {
  NEWS_COMMENT_MAX_BODY_LENGTH,
  NEWS_COMMENT_MAX_DEPTH,
  NEWS_COMMENTS_SECTION_ID,
} from "@/entities/news/lib/comments/constants";
import type { NewsCommentsPage } from "@/entities/news/lib/comments/queries";

const QUICK_EMOJIS = ["😀", "😂", "🔥", "👍", "👎", "💀", "🎯", "❤️", "🤡"];

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function authorForComment(comment: NewsCommentTreeNode): ReactionAuthor {
  return {
    userId: comment.authorUserId,
    username: comment.authorUsername,
    displayName: comment.authorDisplayName,
    avatarUrl: comment.authorAvatar,
    countryFlag: comment.authorCountryFlag,
    steamid64: comment.authorSteamid64,
  };
}

function displayNameFor(comment: NewsCommentTreeNode): string {
  return (
    comment.authorDisplayName?.trim() ||
    comment.authorUsername?.trim() ||
    "Member"
  );
}

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type ComposerProps = {
  articleId: string;
  slug: string;
  canWrite: boolean;
  parentCommentId?: string | null;
  placeholder?: string;
  onCancel?: () => void;
  onSuccess: () => void;
  autoFocus?: boolean;
};

function CommentComposer({
  articleId,
  slug,
  canWrite,
  parentCommentId = null,
  placeholder = "Share your thoughts on this article…",
  onCancel,
  onSuccess,
  autoFocus,
}: ComposerProps) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const insertEmoji = (emoji: string) => {
    setBody((prev) => `${prev}${emoji}`.slice(0, NEWS_COMMENT_MAX_BODY_LENGTH));
  };

  const submit = () => {
    if (!body.trim() || !canWrite) return;
    startTransition(async () => {
      const result = await createNewsCommentAction({
        articleId,
        parentCommentId,
        body: body.trim(),
        slug,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBody("");
      onSuccess();
      toast.success(parentCommentId ? "Reply posted" : "Comment posted");
    });
  };

  if (!canWrite) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm text-muted-foreground">
        <Link href="/auth" className="font-medium text-primary underline">
          Sign in
        </Link>{" "}
        to comment on this article.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) =>
          setBody(e.target.value.slice(0, NEWS_COMMENT_MAX_BODY_LENGTH))
        }
        placeholder={placeholder}
        disabled={pending}
        autoFocus={autoFocus}
        className="min-h-[80px] resize-y"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" disabled={pending}>
                <Smile className="size-4" />
                <span className="sr-only">Insert emoji</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex max-w-[220px] flex-wrap gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded p-1 text-lg transition-transform hover:scale-125 hover:bg-muted"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">
            {body.length}/{NEWS_COMMENT_MAX_BODY_LENGTH}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" disabled={!body.trim() || pending} onClick={submit}>
            {pending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

type CommentItemProps = {
  comment: NewsCommentTreeNode;
  depth: number;
  articleId: string;
  slug: string;
  canWrite: boolean;
  viewerUserId?: string | null;
  viewerAuthor?: ReactionAuthor | null;
  reactionsByComment: Record<string, ReactionView[]>;
  onRefresh: () => void;
};

function CommentItem({
  comment,
  depth,
  articleId,
  slug,
  canWrite,
  viewerUserId,
  viewerAuthor,
  reactionsByComment,
  onRefresh,
}: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [pending, startTransition] = useTransition();

  const isOwn = viewerUserId != null && comment.authorUserId === viewerUserId;
  const author = authorForComment(comment);
  const name = displayNameFor(comment);

  const saveEdit = () => {
    startTransition(async () => {
      const result = await updateNewsCommentAction({
        commentId: comment.id,
        body: editBody.trim(),
        slug,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setEditOpen(false);
      onRefresh();
      toast.success("Comment updated");
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteNewsCommentAction({
        commentId: comment.id,
        slug,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onRefresh();
      toast.success("Comment deleted");
    });
  };

  return (
    <div
      className={cn(
        "space-y-3",
        depth > 0 && "ml-4 border-l border-white/10 pl-4 sm:ml-6",
      )}
    >
      <div
        id={`comment-${comment.id}`}
        className="group/comment flex items-start gap-3 scroll-mt-24 transition-all"
      >
        <UserHoverCard author={author}>
          <Avatar className="size-9 shrink-0 border border-border bg-gradient-to-b from-transparent to-muted transition-colors group-hover/comment:border-muted-foreground/50">
            <AvatarImage src={comment.authorAvatar ?? undefined} alt={name} />
            <AvatarFallback>{avatarInitials(name)}</AvatarFallback>
          </Avatar>
        </UserHoverCard>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <UserHoverCard author={author}>
              <span className="animated-underline-1 cursor-default text-sm font-medium text-muted-foreground transition-colors group-hover/comment:text-foreground">
                {name}
              </span>
            </UserHoverCard>
            <span className="flex items-center gap-1 text-xs text-muted transition-colors group-hover/comment:text-muted-foreground">
              <span className="hidden size-1 rounded-full bg-muted-foreground animate-pulse group-hover/comment:inline-block" />
              <span className="transition-transform group-hover/comment:translate-x-0.5">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </span>
          </div>

          {editOpen ? (
            <div className="space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) =>
                  setEditBody(
                    e.target.value.slice(0, NEWS_COMMENT_MAX_BODY_LENGTH),
                  )
                }
                disabled={pending}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={pending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
          )}

          {!editOpen ? (
            <ReactionBar
              targetType="news_comment"
              targetId={comment.id}
              initialReactions={reactionsByComment[comment.id] ?? []}
              viewerUserId={viewerUserId ?? null}
              viewerAuthor={viewerAuthor}
              canReact={canWrite}
            />
          ) : null}

          {!editOpen ? (
            <div className="flex flex-wrap items-center gap-3">
              {depth < NEWS_COMMENT_MAX_DEPTH && canWrite ? (
                <button
                  type="button"
                  className="group/reply inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setReplyOpen((v) => !v)}
                >
                  <Reply className="size-3 transition-transform group-hover/reply:-rotate-12" />
                  Reply
                </button>
              ) : null}
              {isOwn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MoreHorizontal className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="mr-2 size-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={remove}>
                      <Trash2 className="mr-2 size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}

          {replyOpen ? (
            <div className="pt-2">
              <CommentComposer
                articleId={articleId}
                slug={slug}
                canWrite={canWrite}
                parentCommentId={comment.id}
                placeholder="Write a reply…"
                onCancel={() => setReplyOpen(false)}
                onSuccess={() => {
                  setReplyOpen(false);
                  onRefresh();
                }}
                autoFocus
              />
            </div>
          ) : null}
        </div>
      </div>

      {comment.children.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          depth={depth + 1}
          articleId={articleId}
          slug={slug}
          canWrite={canWrite}
          viewerUserId={viewerUserId}
          viewerAuthor={viewerAuthor}
          reactionsByComment={reactionsByComment}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export type NewsCommentsCardProps = {
  articleId: string;
  slug: string;
  initialPage: NewsCommentsPage;
  viewerUserId?: string | null;
  viewerAuthor?: ReactionAuthor | null;
  canWrite: boolean;
  reactionsByComment?: Record<string, ReactionView[]>;
  articleReactions?: ReactionView[];
};

export function NewsCommentsCard({
  articleId,
  slug,
  initialPage,
  viewerUserId,
  viewerAuthor,
  canWrite,
  reactionsByComment = {},
  articleReactions = [],
}: NewsCommentsCardProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [loadingMore, startLoadMore] = useTransition();

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const loadMore = () => {
    if (!page.nextCursor) return;
    startLoadMore(async () => {
      const result = await loadMoreNewsCommentsAction({
        articleId,
        cursorCreatedAt: page.nextCursor!.createdAt,
        cursorId: page.nextCursor!.id,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPage((prev) => ({
        trees: [...prev.trees, ...result.data.trees],
        topLevelCount: result.data.topLevelCount,
        nextCursor: result.data.nextCursor,
      }));
    });
  };

  return (
    <Card id={NEWS_COMMENTS_SECTION_ID} className="w-full scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4" />
          Comments ({page.topLevelCount})
        </CardTitle>
        <CardDescription>
          Join the discussion. Signed-in members can comment and react.
        </CardDescription>
        <div className="pt-2">
          <ReactionBar
            targetType="news_article"
            targetId={articleId}
            initialReactions={articleReactions}
            viewerUserId={viewerUserId ?? null}
            viewerAuthor={viewerAuthor}
            canReact={canWrite}
            size="md"
            emptyPrompt="React to this article!"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommentComposer
          articleId={articleId}
          slug={slug}
          canWrite={canWrite}
          onSuccess={refresh}
        />

        <Separator />

        {page.trees.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-3 size-10 opacity-40" />
            <p>No comments yet. Be the first to share your thoughts.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {page.trees.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  depth={0}
                  articleId={articleId}
                  slug={slug}
                  canWrite={canWrite}
                  viewerUserId={viewerUserId}
                  viewerAuthor={viewerAuthor}
                  reactionsByComment={reactionsByComment}
                  onRefresh={refresh}
                />
                <Separator className="mt-6" />
              </div>
            ))}
          </div>
        )}

        {page.nextCursor ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more comments"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
