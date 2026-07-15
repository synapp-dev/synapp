"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

/** Duplicate keycap behind (`z-0`), slight static offset — no separate deck div. */
export function PreviewKeycap({
  pressed,
  prefersReducedMotion,
  className,
  children,
}: {
  pressed: boolean;
  prefersReducedMotion: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const keycapBase = cn(
    "inline-flex min-h-[22px] min-w-[1.375rem] items-center justify-center gap-0.5 rounded-[5px] border-x border-t border-zinc-400/50 bg-muted px-1 py-px font-mono text-[9px] font-semibold tabular-nums text-zinc-50 shadow-sm",
    className,
  );

  return (
    <span className="relative inline-flex justify-center overflow-visible pb-1 align-middle">
      <kbd
        aria-hidden
        className={cn(
          keycapBase,
          "pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 translate-y-[2px]",
        )}
      >
        {children}
      </kbd>
      <span
        className={cn(
          "relative z-10 flex justify-center will-change-transform",
          !prefersReducedMotion &&
            "transition-[transform] duration-150 ease-in-out",
          !pressed && !prefersReducedMotion && "-translate-y-[2px]",
          pressed && !prefersReducedMotion && "translate-y-[2px]",
        )}
      >
        <kbd
          className={cn(
            keycapBase,
            "relative cursor-default",
            !prefersReducedMotion &&
              "transition-[border-color,background-image,color] duration-150 ease-in-out",
            pressed &&
              "border-sky-500/45 bg-gradient-to-b from-sky-600 to-sky-950 text-sky-100",
          )}
        >
          {children}
        </kbd>
      </span>
    </span>
  );
}
