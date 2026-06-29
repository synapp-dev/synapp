"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, MessageCircle } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { ReactionBar } from "@/entities/reactions/components/reaction-bar";
import { UserHoverCard } from "@/entities/reactions/components/user-hover-card";
import { CountryFlag } from "@/entities/players/components/country-flag";
import {
  authorName,
  type ReactionAuthor,
  type ReactionView,
} from "@/entities/reactions/lib/types";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { NewsTagChips } from "./news-tag-chip";
import { NewsCommentsCard } from "./news-comments-card";
import { ArticleAuthorFooter } from "./article-author-footer";
import { ArticleReadingRail } from "./article-reading-rail";
import { ArticleShareButton } from "./article-share-button";
import { ArticleSubscribeCard } from "./article-subscribe-card";
import { ArticleViewCounter } from "./article-view-counter";
import {
  ArticleWidthProvider,
  useArticleWidth,
} from "./article-width-context";
import type { ArticleTag } from "../lib/queries";
import type { ReadTime } from "../lib/read-time";
import type { NewsSubscriptionState } from "../lib/subscribe/queries";
import type { NewsViewBreakdown } from "../lib/views/queries";
import type { NewsCommentsPage } from "../lib/comments/queries";

export type NewsArticleViewProps = {
  article: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
    author: ReactionAuthor;
    authorBio: string | null;
  };
  tags: ArticleTag[];
  readTime: ReadTime;
  views: NewsViewBreakdown;
  subscription: NewsSubscriptionState;
  /** Server-rendered article body (TipTap → HTML). */
  body: React.ReactNode;
  commentsPage: NewsCommentsPage;
  reactionsByComment: Record<string, ReactionView[]>;
  articleReactions: ReactionView[];
  viewerUserId: string | null;
  viewerAuthor: ReactionAuthor | null;
  canWrite: boolean;
};

/** Width-controlled reading column for the body + closing sections. */
function ReadingColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { width } = useArticleWidth();
  return (
    <div
      className={cn(
        "mx-auto w-full transition-[max-width] duration-300 ease-out",
        width === "wide" ? "max-w-4xl" : "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ReadTimeChip({ readTime }: { readTime: ReadTime }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="animated-underline-1 cursor-default select-none text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {readTime.minutes}
            </span>{" "}
            min read
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="flex items-center gap-2 border border-muted bg-background px-3 py-2 text-muted-foreground"
        >
          <span className="text-xs">
            <span className="font-bold text-foreground">
              {readTime.words.toLocaleString()}
            </span>{" "}
            words
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs">
            <span className="font-bold text-foreground">
              {readTime.characters.toLocaleString()}
            </span>{" "}
            characters
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function NewsArticleView(props: NewsArticleViewProps) {
  return (
    <ArticleWidthProvider>
      <NewsArticleViewInner {...props} />
    </ArticleWidthProvider>
  );
}

function NewsArticleViewInner({
  article,
  tags,
  readTime,
  views,
  subscription,
  body,
  commentsPage,
  reactionsByComment,
  articleReactions,
  viewerUserId,
  viewerAuthor,
  canWrite,
}: NewsArticleViewProps) {
  const reduce = usePrefersReducedMotion();
  const name = authorName(article.author);
  const dateLabel = article.publishedAt
    ? format(new Date(article.publishedAt), "EEEE, d MMMM yyyy")
    : "";
  const hasCover = Boolean(article.coverImageUrl);

  // Slow, Landmark-style cinematic stagger; collapsed to instant under
  // prefers-reduced-motion.
  const anim = (delay: string, dir: "left" | "down" = "left") =>
    reduce
      ? ""
      : cn(
          dir === "down"
            ? "animate-slide-down-fade-in"
            : "animate-slide-left-fade-in",
          "opacity-0 [animation-duration:1.8s] [animation-fill-mode:forwards]",
          delay,
        );

  return (
    <div className="relative pb-16">
      <ArticleReadingRail
        title={article.title}
        commentCount={commentsPage.topLevelCount}
      />

      <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/news"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All news
          </Link>

          {/* ---- Masthead ---- */}
          {hasCover ? (
            <div
              className={cn(
                "relative aspect-[16/9] w-full",
                anim("[animation-delay:0s]", "down"),
              )}
            >
              {/* The image dissolves to transparent toward the bottom (mask) so
                  the overlapping title blends into the page rather than sitting
                  on a hard framed edge. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN media */}
              <img
                src={article.coverImageUrl!}
                alt=""
                className="size-full rounded-2xl object-cover [mask-image:linear-gradient(to_bottom,black_40%,transparent_90%)] [-webkit-mask-image:linear-gradient(to_bottom,black_40%,transparent_90%)]"
                aria-hidden
              />
            </div>
          ) : null}

          <div className={cn("relative z-10", hasCover && "-mt-32 sm:-mt-44")}>
            <p
              className={cn(
                "text-sm font-medium uppercase tracking-wider text-muted-foreground",
                anim("[animation-delay:0.15s]"),
              )}
            >
              {dateLabel}
            </p>

            {tags.length > 0 ? (
              <div className={cn("mt-4", anim("[animation-delay:0.3s]"))}>
                <NewsTagChips tags={tags} />
              </div>
            ) : null}

            <h1
              className={cn(
                "mt-4 text-4xl font-black tracking-tight text-balance sm:text-5xl sm:leading-[1.05]",
                anim("[animation-delay:0.45s]"),
              )}
            >
              {article.title}
            </h1>

            {article.excerpt ? (
              <p
                className={cn(
                  "mt-4 text-xl font-medium leading-snug text-muted-foreground",
                  anim("[animation-delay:0.6s]"),
                )}
              >
                {article.excerpt}
              </p>
            ) : null}

            {/* Byline */}
            <div
              className={cn(
                "mt-6 flex flex-wrap items-center gap-x-3 gap-y-2",
                anim("[animation-delay:0.8s]"),
              )}
            >
              <UserHoverCard author={article.author}>
                <Avatar className="size-10 border border-border">
                  <AvatarImage
                    src={article.author.avatarUrl ?? undefined}
                    alt={name}
                  />
                  <AvatarFallback>{avatarInitials(name)}</AvatarFallback>
                </Avatar>
              </UserHoverCard>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <UserHoverCard author={article.author}>
                    <span className="animated-underline-1 text-sm font-semibold">
                      {name}
                    </span>
                  </UserHoverCard>
                  {article.author.countryFlag ? (
                    <CountryFlag code={article.author.countryFlag} />
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{dateLabel}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <ReadTimeChip readTime={readTime} />
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div
              className={cn(
                "mt-5 flex flex-wrap items-center gap-x-4 gap-y-2",
                anim("[animation-delay:1s]"),
              )}
            >
              <ArticleViewCounter articleId={article.id} initial={views} />
              <ArticleShareButton title={article.title} />
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("news-comments")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageCircle className="size-4" />
                {commentsPage.topLevelCount}
              </button>
            </div>
          </div>
        </div>

        <Separator className="mx-auto my-10 max-w-4xl" />

        {/* ---- Body (reader-controlled width, serif) ---- */}
        <ReadingColumn
          className={cn(anim("[animation-delay:1.2s]", "down"))}
        >
          <div
            id="news-article-body"
            className="font-[Georgia,'Times_New_Roman',serif]"
          >
            {body}
          </div>
        </ReadingColumn>

        <ReadingColumn className="mt-12 space-y-8">
          <Separator />

          <div id="news-reactions">
            <ReactionBar
              targetType="news_article"
              targetId={article.id}
              initialReactions={articleReactions}
              viewerUserId={viewerUserId}
              viewerAuthor={viewerAuthor}
              canReact={canWrite}
              size="md"
              emptyPrompt="React to this article!"
            />
          </div>

          <ArticleAuthorFooter author={article.author} bio={article.authorBio} />

          <ArticleSubscribeCard state={subscription} />

          <NewsCommentsCard
            articleId={article.id}
            slug={article.slug}
            initialPage={commentsPage}
            viewerUserId={viewerUserId}
            viewerAuthor={viewerAuthor}
            canWrite={canWrite}
            reactionsByComment={reactionsByComment}
            articleReactions={articleReactions}
          />
        </ReadingColumn>
      </div>
  );
}
