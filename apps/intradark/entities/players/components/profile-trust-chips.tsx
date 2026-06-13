"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { PROFILE_COMMENTS_SECTION_ID } from "@/entities/players/lib/profile-comments/constants";
import type { ProfileTrustCounts } from "@/entities/players/lib/profile-comments/queries";

type ProfileTrustChipsProps = {
  counts: ProfileTrustCounts;
  className?: string;
  /** e.g. switch to Overview before scrolling to comments. */
  onBeforeScroll?: () => void;
};

function scrollToComments(onBeforeScroll?: () => void) {
  onBeforeScroll?.();
  requestAnimationFrame(() => {
    document.getElementById(PROFILE_COMMENTS_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function ProfileTrustChips({
  counts,
  className,
  onBeforeScroll,
}: ProfileTrustChipsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => scrollToComments(onBeforeScroll)}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
        aria-label={`${counts.legit} community legit votes. Scroll to comments.`}
      >
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
        <span>{counts.legit} legit</span>
      </button>
      <button
        type="button"
        onClick={() => scrollToComments(onBeforeScroll)}
        className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"
        aria-label={`${counts.suspicious} community suspicious votes. Scroll to comments.`}
      >
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        <span>{counts.suspicious} suspicious</span>
      </button>
    </div>
  );
}
