import * as React from "react";

import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { SUPERBOT_SUGGESTION_ICONS } from "@/entities/dashboard/components/superbot-suggestion-icons";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

function useActiveRowBorderFade(selected: boolean, reduceMotion: boolean) {
  const [borderShown, setBorderShown] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!selected) {
      setBorderShown(false);
      return;
    }
    if (reduceMotion) {
      setBorderShown(true);
      return;
    }
    setBorderShown(false);
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setBorderShown(true);
      });
    });
    return () => window.cancelAnimationFrame(outer);
  }, [selected, reduceMotion]);

  return borderShown;
}

export type SuperbotSuggestionNavButtonProps = {
  suggestion: SuperbotSuggestion;
  selected: boolean;
  reduceMotion: boolean;
  hoverPaused: boolean;
  progressFillRef: React.RefObject<HTMLSpanElement | null>;
  onSelect: () => void;
};

export function SuperbotSuggestionNavButton({
  suggestion,
  selected,
  reduceMotion,
  hoverPaused,
  progressFillRef,
  onSelect,
}: SuperbotSuggestionNavButtonProps) {
  const borderShown = useActiveRowBorderFade(selected, reduceMotion);
  const Icon = SUPERBOT_SUGGESTION_ICONS[suggestion.iconId];

  return (
    <Button
      type="button"
      variant="ghost"
      className="relative h-auto min-h-11 w-full min-w-0 flex-row items-center justify-start gap-2 overflow-hidden rounded-full border-0 px-3 py-2 text-left shadow-none"
      aria-label={`Show suggestion: ${suggestion.title}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {selected && !reduceMotion ? (
        <span
          ref={progressFillRef}
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-0 w-full origin-left bg-[color-mix(in_oklab,var(--brand-supersolt-primary)_22%,transparent)] will-change-transform [transform:scaleX(0)]",
            hoverPaused && "opacity-90",
          )}
          aria-hidden
        />
      ) : null}
      {selected ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-[1] rounded-full ring-1 ring-inset ring-[color:var(--brand-supersolt-primary)] transition-opacity duration-700 ease-out",
            reduceMotion || borderShown ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
      <Icon
        className={cn(
          "relative z-10 h-5 w-5 shrink-0",
          selected
            ? "text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_12%,#0f2417)]"
            : "text-foreground",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "relative z-10 min-w-0 flex-1 text-left text-sm leading-snug tracking-tight line-clamp-2",
          selected
            ? "font-semibold text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_12%,#0f2417)]"
            : "font-normal text-foreground",
        )}
      >
        {suggestion.gridLabel}
      </span>
    </Button>
  );
}
