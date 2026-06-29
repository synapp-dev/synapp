"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import {
  authorName,
  authorProfileHref,
  type ReactionAuthor,
} from "@/entities/reactions/lib/types";

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Substack-style end-of-post author card. */
export function ArticleAuthorFooter({
  author,
  bio,
}: {
  author: ReactionAuthor;
  bio: string | null;
}) {
  const name = authorName(author);
  const href = authorProfileHref(author);

  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card/40 p-5">
      <UserHoverCard author={author}>
        {href ? (
          <Link href={href} className="shrink-0">
            <Avatar className="size-14 border border-border transition-colors hover:border-muted-foreground/60">
              <AvatarImage src={author.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="size-14 border border-border">
            <AvatarImage src={author.avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        )}
      </UserHoverCard>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Written by
        </p>
        <UserHoverCard author={author}>
          <span className="animated-underline-1 inline-block text-lg font-semibold">
            {name}
          </span>
        </UserHoverCard>
        {bio ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{bio}</p>
        ) : null}
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary opacity-80 transition-opacity hover:opacity-100"
          >
            View profile
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
