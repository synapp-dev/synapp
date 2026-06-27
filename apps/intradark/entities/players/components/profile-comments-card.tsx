"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Flag,
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
import { Badge } from "@workspace/ui/components/badge";
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

import {
  createPlayerProfileCommentAction,
  deletePlayerProfileCommentAction,
  loadMorePlayerProfileCommentsAction,
  reportPlayerProfileCommentAction,
  updatePlayerProfileCommentAction,
} from "@/entities/players/actions/profile-comments-actions";
import type { ProfileCommentTreeNode } from "@/entities/players/lib/profile-comments/build-comment-tree";
import {
  PLAYER_PROFILE_MAX_BODY_LENGTH,
  PROFILE_COMMENTS_SECTION_ID,
  type ProfileTrustSignal,
} from "@/entities/players/lib/profile-comments/constants";
import type { ProfileCommentEligibility } from "@/entities/players/lib/profile-comments/eligibility";
import type { ProfileCommentsPage } from "@/entities/players/lib/profile-comments/queries";

const QUICK_EMOJIS = ["😀", "😂", "🔥", "👍", "👎", "💀", "🎯", "❤️", "🤡"];

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function trustBadge(signal: ProfileTrustSignal | null) {
  if (signal === "legit") {
    return (
      <Badge
        variant="secondary"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      >
        Legit
      </Badge>
    );
  }
  if (signal === "suspicious") {
    return (
      <Badge
        variant="secondary"
        className="border-amber-500/30 bg-amber-500/10 text-amber-300"
      >
        Suspicious
      </Badge>
    );
  }
  return null;
}

type TrustToggleProps = {
  value: ProfileTrustSignal | null;
  onChange: (v: ProfileTrustSignal | null) => void;
  disabled?: boolean;
};

function TrustToggle({ value, onChange, disabled }: TrustToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={value === "legit" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => onChange(value === "legit" ? null : "legit")}
      >
        Legit
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "suspicious" ? "default" : "outline"}
        disabled={disabled}
        onClick={() =>
          onChange(value === "suspicious" ? null : "suspicious")
        }
      >
        Suspicious
      </Button>
    </div>
  );
}

type ComposerProps = {
  steamid64: string;
  linkedUsername?: string | null;
  eligibility: ProfileCommentEligibility;
  parentCommentId?: string | null;
  placeholder?: string;
  onCancel?: () => void;
  onSuccess: () => void;
  autoFocus?: boolean;
};

function CommentComposer({
  steamid64,
  linkedUsername,
  eligibility,
  parentCommentId = null,
  placeholder = "Share your thoughts about this player…",
  onCancel,
  onSuccess,
  autoFocus,
}: ComposerProps) {
  const [body, setBody] = useState("");
  const [trustSignal, setTrustSignal] = useState<ProfileTrustSignal | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const insertEmoji = (emoji: string) => {
    setBody((prev) => `${prev}${emoji}`.slice(0, PLAYER_PROFILE_MAX_BODY_LENGTH));
  };

  const submit = () => {
    if (!body.trim() || !eligibility.canWrite) return;
    startTransition(async () => {
      const result = await createPlayerProfileCommentAction({
        subjectSteamid64: steamid64,
        parentCommentId,
        body: body.trim(),
        trustSignal: eligibility.canVote ? trustSignal : null,
        linkedUsername,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBody("");
      setTrustSignal(null);
      onSuccess();
      toast.success(parentCommentId ? "Reply posted" : "Comment posted");
    });
  };

  if (!eligibility.canWrite) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm text-muted-foreground">
        {eligibility.blockReason === "sign_in" ? (
          <>
            <Link href="/auth" className="font-medium text-primary underline">
              Sign in
            </Link>{" "}
            to comment on this profile.
          </>
        ) : (
          <>
            <Link
              href="/api/auth/steam"
              className="font-medium text-primary underline"
            >
              Link Steam
            </Link>{" "}
            to comment on this profile.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) =>
          setBody(e.target.value.slice(0, PLAYER_PROFILE_MAX_BODY_LENGTH))
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
                    className="rounded p-1 text-lg hover:bg-muted"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">
            {body.length}/{PLAYER_PROFILE_MAX_BODY_LENGTH}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          {eligibility.canVote ? (
            <TrustToggle
              value={trustSignal}
              onChange={setTrustSignal}
              disabled={pending}
            />
          ) : null}
          <Button
            type="button"
            disabled={!body.trim() || pending}
            onClick={submit}
          >
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
  comment: ProfileCommentTreeNode;
  depth: number;
  steamid64: string;
  linkedUsername?: string | null;
  eligibility: ProfileCommentEligibility;
  viewerUserId?: string | null;
  onRefresh: () => void;
};

function CommentItem({
  comment,
  depth,
  steamid64,
  linkedUsername,
  eligibility,
  viewerUserId,
  onRefresh,
}: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editTrust, setEditTrust] = useState<ProfileTrustSignal | null>(
    comment.trustSignal,
  );
  const [pending, startTransition] = useTransition();

  const isOwn = viewerUserId != null && comment.authorUserId === viewerUserId;
  const initials =
    comment.authorUsername?.slice(0, 2).toUpperCase() ?? "??";

  const saveEdit = () => {
    startTransition(async () => {
      const result = await updatePlayerProfileCommentAction({
        commentId: comment.id,
        body: editBody.trim(),
        trustSignal: eligibility.canVote ? editTrust : undefined,
        linkedUsername,
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
      const result = await deletePlayerProfileCommentAction({
        commentId: comment.id,
        linkedUsername,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onRefresh();
      toast.success("Comment deleted");
    });
  };

  const report = () => {
    startTransition(async () => {
      const result = await reportPlayerProfileCommentAction({
        commentId: comment.id,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Report received. Thanks.");
    });
  };

  return (
    <div
      className={cn("space-y-3", depth > 0 && "ml-4 border-l border-white/10 pl-4 sm:ml-6")}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={comment.authorAvatar ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {comment.authorUsername ?? "Player"}
            </span>
            {trustBadge(comment.trustSignal)}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          {editOpen ? (
            <div className="space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) =>
                  setEditBody(
                    e.target.value.slice(0, PLAYER_PROFILE_MAX_BODY_LENGTH),
                  )
                }
                disabled={pending}
              />
              {eligibility.canVote ? (
                <TrustToggle
                  value={editTrust}
                  onChange={setEditTrust}
                  disabled={pending}
                />
              ) : null}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={pending}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditOpen(false)}
                >
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
            <div className="flex flex-wrap items-center gap-3">
              {depth < 3 && eligibility.canWrite ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyOpen((v) => !v)}
                >
                  <Reply className="size-3" />
                  Reply
                </button>
              ) : null}
              {isOwn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
              ) : eligibility.canWrite ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={report}
                  disabled={pending}
                >
                  <Flag className="size-3" />
                  Report
                </button>
              ) : null}
            </div>
          ) : null}

          {replyOpen ? (
            <div className="pt-2">
              <CommentComposer
                steamid64={steamid64}
                linkedUsername={linkedUsername}
                eligibility={eligibility}
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
          steamid64={steamid64}
          linkedUsername={linkedUsername}
          eligibility={eligibility}
          viewerUserId={viewerUserId}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export type ProfileCommentsCardProps = {
  steamid64: string;
  linkedUsername?: string | null;
  initialPage: ProfileCommentsPage;
  eligibility: ProfileCommentEligibility;
  viewerUserId?: string | null;
};

export function ProfileCommentsCard({
  steamid64,
  linkedUsername,
  initialPage,
  eligibility,
  viewerUserId,
}: ProfileCommentsCardProps) {
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
      const result = await loadMorePlayerProfileCommentsAction({
        subjectSteamid64: steamid64,
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
    <Card id={PROFILE_COMMENTS_SECTION_ID} className="w-full scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4" />
          Comments ({page.topLevelCount})
        </CardTitle>
        <CardDescription>
          Community notes about this player. Steam-linked members can comment and
          optionally mark legit or suspicious.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommentComposer
          steamid64={steamid64}
          linkedUsername={linkedUsername}
          eligibility={eligibility}
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
                  steamid64={steamid64}
                  linkedUsername={linkedUsername}
                  eligibility={eligibility}
                  viewerUserId={viewerUserId}
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
