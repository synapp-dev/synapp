import Link from "next/link";

import { Button } from "@workspace/ui/components/button";

type ThreadRow = {
  id: string;
  slug: string;
  title: string;
  authorUserId: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  authorDisplayName: string | null;
  authorUsername: string | null;
};

function authorLabel(t: ThreadRow): string {
  return (
    t.authorDisplayName?.trim() ||
    t.authorUsername?.trim() ||
    "Player"
  );
}

export function ForumThreadList({
  categorySlug,
  threads,
  signedIn,
}: {
  categorySlug: string;
  threads: ThreadRow[];
  signedIn: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {threads.length} thread{threads.length === 1 ? "" : "s"}
        </p>
        {signedIn ? (
          <Button asChild size="sm">
            <Link href={`/forums/${categorySlug}/new`}>New thread</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/auth?returnTo=${encodeURIComponent(`/forums/${categorySlug}/new`)}`}>
              Sign in to post
            </Link>
          </Button>
        )}
      </div>
      <ul className="divide-y rounded-lg border">
        {threads.length === 0 ? (
          <li className="p-6 text-center text-muted-foreground text-sm">
            No threads yet. Be the first to start one.
          </li>
        ) : (
          threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forums/${categorySlug}/${t.slug}`}
                className="block p-4 transition-colors hover:bg-muted/50"
              >
                <div className="font-medium">{t.title}</div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span>{authorLabel(t)}</span>
                  <span>
                    {t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"}
                  </span>
                  <span>
                    Updated{" "}
                    {new Date(t.updatedAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
