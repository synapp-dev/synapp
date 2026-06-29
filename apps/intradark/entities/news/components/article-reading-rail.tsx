"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  MessageCircle,
  Minimize2,
  Maximize2,
  SmilePlus,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { ArticleShareButton } from "./article-share-button";
import { useArticleWidth } from "./article-width-context";

const BODY_ID = "news-article-body";
const REACTIONS_ID = "news-reactions";
const COMMENTS_ID = "news-comments";

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function RailButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {children}
          {badge != null && badge > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Floating left-margin reader rail (desktop only): width toggle, react, jump to
 * comments, share, back-to-top. Fades/slides in once you scroll past the
 * masthead and out near the footer. Its vertical track doubles as the reading
 * progress indicator, filling as you scroll the article body.
 */
export function ArticleReadingRail({
  title,
  commentCount,
}: {
  title: string;
  commentCount: number;
}) {
  const { width, toggle } = useArticleWidth();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  const recompute = useCallback(() => {
    const scrollY = window.scrollY;
    const innerH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;

    const body = document.getElementById(BODY_ID);
    if (body) {
      const start = body.offsetTop;
      const end = start + body.offsetHeight - innerH;
      const ratio = end > start ? (scrollY - start) / (end - start) : 0;
      setProgress(Math.min(1, Math.max(0, ratio)));
    }

    const pastMasthead = scrollY > 350;
    const nearFooter = docH - (scrollY + innerH) < 240;
    setVisible(pastMasthead && !nearFooter);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        recompute();
      });
    };
    recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [recompute]);

  return (
    <TooltipProvider>
      {/* Anchored to the content column's right edge (≈ the app header's
          theme-switcher line), sticky-centered in the viewport while reading,
          releasing at the footer. Desktop only — there's no right gutter on
          narrow screens. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden lg:block">
        <div
          className={cn(
            "pointer-events-auto sticky top-1/2 flex -translate-y-1/2 transition-all duration-500",
            visible
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0",
          )}
        >
          <div className="flex flex-col items-center gap-1 rounded-full border bg-card/70 p-1 shadow-sm backdrop-blur">
            <RailButton
              label={width === "narrow" ? "Wider column" : "Narrower column"}
              onClick={toggle}
            >
              {width === "narrow" ? (
                <Maximize2 className="size-4" />
              ) : (
                <Minimize2 className="size-4" />
              )}
            </RailButton>
            <RailButton label="React" onClick={() => scrollToId(REACTIONS_ID)}>
              <SmilePlus className="size-4" />
            </RailButton>
            <RailButton
              label="Comments"
              onClick={() => scrollToId(COMMENTS_ID)}
              badge={commentCount}
            >
              <MessageCircle className="size-4" />
            </RailButton>
            <ArticleShareButton title={title} variant="icon" />
            <RailButton
              label="Back to top"
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
            >
              <ArrowUp className="size-4" />
            </RailButton>
          </div>

          {/* Reading-progress track — fills top→bottom with body scroll. */}
          <div className="relative ml-2 w-0.5 self-stretch overflow-hidden rounded-full bg-border">
            <div
              className="absolute left-0 top-0 w-full rounded-full bg-primary transition-[height] duration-150 ease-out"
              style={{ height: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
