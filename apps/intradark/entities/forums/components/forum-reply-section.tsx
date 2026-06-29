"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { createForumReplyAction, softDeleteForumReplyAction } from "@/entities/forums/actions";
import {
  buildReplyTree,
  type ForumReplyFlat,
  type ForumReplyTreeNode,
} from "@/entities/forums/lib/build-reply-tree";
import { ReactionBar } from "@/entities/reactions/components/reaction-bar";
import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import type { ReactionAuthor, ReactionView } from "@/entities/reactions/lib/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

function authorLabel(r: ForumReplyFlat): string {
  return (
    r.authorDisplayName?.trim() ||
    r.authorUsername?.trim() ||
    "Player"
  );
}

function authorForReply(r: ForumReplyFlat): ReactionAuthor {
  return {
    userId: r.authorUserId,
    username: r.authorUsername,
    displayName: r.authorDisplayName,
    avatarUrl: r.authorAvatar,
    countryFlag: r.authorCountryFlag,
    steamid64: r.authorSteamid64,
  };
}

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function ReplyComposer({
  threadId,
  parentReplyId,
  onDone,
}: {
  threadId: string;
  parentReplyId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createForumReplyAction({
        threadId,
        parentReplyId: parentReplyId ?? undefined,
        body,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setBody("");
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3">
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <Label className="sr-only" htmlFor={`reply-${parentReplyId ?? "root"}`}>
        Reply
      </Label>
      <Textarea
        id={`reply-${parentReplyId ?? "root"}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        required
        className="resize-y text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post reply"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReplyBranch({
  node,
  depth,
  threadId,
  signedIn,
  currentUserId,
  viewerAuthor,
  reactionsByReply,
  openComposerId,
  setOpenComposerId,
}: {
  node: ForumReplyTreeNode;
  depth: number;
  threadId: string;
  signedIn: boolean;
  currentUserId: string | null;
  viewerAuthor: ReactionAuthor | null;
  reactionsByReply: Record<string, ReactionView[]>;
  openComposerId: string | null;
  setOpenComposerId: (id: string | null) => void;
}) {
  const router = useRouter();
  const indent = Math.min(depth, 8) * 12;
  const isOpen = openComposerId === node.id;
  const isMine = currentUserId != null && node.authorUserId === currentUserId;
  const [delPending, startDel] = React.useTransition();

  const author = authorForReply(node);
  const name = authorLabel(node);

  return (
    <div
      className="mt-3 border-l border-border pl-3"
      style={{ marginLeft: indent }}
    >
      <div className="group/comment flex items-start gap-3">
        <UserHoverCard author={author}>
          <Avatar className="size-8 shrink-0 border border-border bg-gradient-to-b from-transparent to-muted transition-colors group-hover/comment:border-muted-foreground/50">
            <AvatarImage src={node.authorAvatar ?? undefined} alt={name} />
            <AvatarFallback>{avatarInitials(name)}</AvatarFallback>
          </Avatar>
        </UserHoverCard>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <UserHoverCard author={author}>
              <span className="animated-underline-1 cursor-default text-sm font-medium text-muted-foreground transition-colors group-hover/comment:text-foreground">
                {name}
              </span>
            </UserHoverCard>
            <span className="flex items-center gap-1 text-xs text-muted transition-colors group-hover/comment:text-muted-foreground">
              <span className="hidden size-1 rounded-full bg-muted-foreground animate-pulse group-hover/comment:inline-block" />
              <span className="transition-transform group-hover/comment:translate-x-0.5">
                {formatRelativeTime(node.createdAt)}
              </span>
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{node.body}</p>
          <div className="mt-2">
            <ReactionBar
              size="sm"
              targetType="forum_reply"
              targetId={node.id}
              initialReactions={reactionsByReply[node.id] ?? []}
              viewerUserId={currentUserId}
              viewerAuthor={viewerAuthor}
              canReact={signedIn}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
            {signedIn ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setOpenComposerId(isOpen ? null : node.id)}
              >
                Reply
              </Button>
            ) : null}
            {isMine ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive h-7 px-2"
                disabled={delPending}
                onClick={() => {
                  if (!confirm("Delete this reply and your nested replies under it?")) {
                    return;
                  }
                  startDel(async () => {
                    const res = await softDeleteForumReplyAction({ replyId: node.id });
                    if (!res.ok) {
                      alert(res.message);
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
          {isOpen ? (
            <ReplyComposer
              threadId={threadId}
              parentReplyId={node.id}
              onDone={() => setOpenComposerId(null)}
            />
          ) : null}
        </div>
      </div>
      {node.children.map((child) => (
        <ReplyBranch
          key={child.id}
          node={child}
          depth={depth + 1}
          threadId={threadId}
          signedIn={signedIn}
          currentUserId={currentUserId}
          viewerAuthor={viewerAuthor}
          reactionsByReply={reactionsByReply}
          openComposerId={openComposerId}
          setOpenComposerId={setOpenComposerId}
        />
      ))}
    </div>
  );
}

export function ForumReplySection({
  threadId,
  flatReplies,
  signedIn,
  currentUserId,
  reactionsByReply,
  viewerAuthor,
}: {
  threadId: string;
  flatReplies: ForumReplyFlat[];
  signedIn: boolean;
  currentUserId: string | null;
  reactionsByReply: Record<string, ReactionView[]>;
  viewerAuthor: ReactionAuthor | null;
}) {
  const tree = React.useMemo(() => buildReplyTree(flatReplies), [flatReplies]);
  const [openRoot, setOpenRoot] = React.useState(false);
  const [openComposerId, setOpenComposerId] = React.useState<string | null>(null);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Replies</h2>
      {signedIn ? (
        <div>
          {!openRoot ? (
            <Button type="button" size="sm" onClick={() => setOpenRoot(true)}>
              Add reply
            </Button>
          ) : (
            <ReplyComposer
              threadId={threadId}
              parentReplyId={null}
              onDone={() => setOpenRoot(false)}
            />
          )}
        </div>
      ) : null}
      <div>
        {tree.length === 0 ? (
          <p className="text-muted-foreground text-sm">No replies yet.</p>
        ) : (
          tree.map((node) => (
            <ReplyBranch
              key={node.id}
              node={node}
              depth={0}
              threadId={threadId}
              signedIn={signedIn}
              currentUserId={currentUserId}
              viewerAuthor={viewerAuthor}
              reactionsByReply={reactionsByReply}
              openComposerId={openComposerId}
              setOpenComposerId={setOpenComposerId}
            />
          ))
        )}
      </div>
    </section>
  );
}
