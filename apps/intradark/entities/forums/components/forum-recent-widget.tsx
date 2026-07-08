import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

import { EmptyState } from "@/components/atoms/empty-state";

export type RecentForumThread = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  updatedAt: string;
  replyCount: number;
  authorDisplayName: string | null;
  authorUsername: string | null;
};

/** Right-rail widget: most recently active forum threads. */
export function ForumRecentWidget({
  threads,
}: {
  threads: RecentForumThread[];
}) {
  if (threads.length === 0) {
    return (
      <EmptyState>
        No discussions yet. Start the first thread on the forums.
      </EmptyState>
    );
  }

  return (
    <ul className="bg-card divide-border divide-y rounded-xl border">
      {threads.map((thread) => {
        const author =
          thread.authorDisplayName ?? thread.authorUsername ?? "Member";
        return (
          <li key={thread.id}>
            <Link
              href={`/forums/${thread.categorySlug}/${thread.slug}`}
              className="hover:bg-accent/50 flex flex-col gap-1.5 p-4 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-medium">
                  {thread.categoryLabel}
                </Badge>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <MessageSquare className="size-3" />
                  {thread.replyCount}
                </span>
              </div>
              <p className="line-clamp-2 text-sm leading-snug font-medium">
                {thread.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {author} ·{" "}
                {formatDistanceToNow(new Date(thread.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
