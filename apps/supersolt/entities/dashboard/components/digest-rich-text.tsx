"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import { segmentDigestLine } from "@/entities/dashboard/lib/digest-highlight";

export function DigestHighlightedLine({ line }: { line: string }) {
  const segments = React.useMemo(() => segmentDigestLine(line), [line]);
  return (
    <>
      {segments.map((segment, i) =>
        segment.highlight ? (
          <strong key={i} className="font-semibold tabular-nums">
            {segment.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}

export type DigestRichTextProps = {
  text: string;
  /** Rendered inline after the final line (e.g. a streaming caret). */
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * Digest prose renderer: bolds the numbers, percentages, and dates an
 * operator scans for, and turns "- " lines into softly marked bullets.
 */
export function DigestRichText({ text, trailing, className }: DigestRichTextProps) {
  const lines = text.split("\n");
  const lastIndex = lines.length - 1;

  return (
    <div className={cn("space-y-1.5", className)}>
      {lines.map((line, index) => {
        const bullet = line.trimStart().startsWith("- ");
        const content = bullet ? line.trimStart().slice(2) : line;
        const isLast = index === lastIndex;

        if (!bullet && content.trim() === "") {
          // Preserve paragraph gaps without stacking empty rows.
          return isLast && trailing ? <p key={index}>{trailing}</p> : null;
        }

        return bullet ? (
          <p key={index} className="flex gap-2 pl-0.5">
            <span aria-hidden className="text-primary/60 select-none">
              &ndash;
            </span>
            <span className="min-w-0 flex-1">
              <DigestHighlightedLine line={content} />
              {isLast ? trailing : null}
            </span>
          </p>
        ) : (
          <p key={index}>
            <DigestHighlightedLine line={content} />
            {isLast ? trailing : null}
          </p>
        );
      })}
    </div>
  );
}
