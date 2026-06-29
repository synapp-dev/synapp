"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import { cn } from "@workspace/ui/lib/utils";

import { CountryFlag } from "@/entities/players/components/country-flag";

import { authorName, authorProfileHref, type ReactionAuthor } from "../lib/types";

function initialsFor(author: ReactionAuthor): string {
  const base =
    author.displayName?.trim() || author.username?.trim() || "";
  if (!base) return "??";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

type UserHoverCardProps = {
  author: ReactionAuthor;
  children: React.ReactNode;
  /** Pass false to render children as-is with no hovercard (e.g. unknown author). */
  enabled?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

/**
 * Wraps a name/avatar trigger with a profile peek card, ported from the Landmark
 * comment UX: hover after a short delay to reveal the player's avatar, name,
 * country and a link to their profile. No fetch — renders from the author bits
 * already joined at query time.
 */
export function UserHoverCard({
  author,
  children,
  enabled = true,
  side = "top",
  align = "start",
}: UserHoverCardProps) {
  const href = authorProfileHref(author);
  if (!enabled || !href) return <>{children}</>;

  const name = authorName(author);

  return (
    <HoverCard openDelay={300} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={10}
        className="animate-slide-up-fade-in w-72 overflow-hidden p-0"
      >
        <div className="flex gap-3 p-4">
          <Link href={href} className="shrink-0">
            <Avatar className="size-14 border border-border transition-colors hover:border-muted-foreground/60">
              <AvatarImage src={author.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{initialsFor(author)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <Link
              href={href}
              className="animated-underline-1 w-fit text-base font-semibold leading-tight"
            >
              {name}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {author.countryFlag ? (
                <CountryFlag code={author.countryFlag} />
              ) : null}
              {author.username ? <span>@{author.username}</span> : null}
            </div>
            <Link
              href={href}
              className={cn(
                "mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary",
                "opacity-80 transition-opacity hover:opacity-100",
              )}
            >
              View profile
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
