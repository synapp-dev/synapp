import { cn } from "@workspace/ui/lib/utils";

/**
 * Top-edge accent: 1px border color at rest, grows to 2px brand color on hover.
 * Card shell keeps left/right/bottom borders; pseudo owns the top so width can animate.
 */
const SOURCE_CARD_HOVER_BORDER = cn(
  "relative border-t-0",
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10",
  "before:h-px before:rounded-t-xl before:bg-border",
  "before:transition-[height,background-color] before:duration-[400ms] before:ease-in-out",
);

const SOURCE_CARD_HOVER_COLOR = {
  leetify: "hover:before:h-0.5 hover:before:bg-[var(--brand-leetify)]",
  faceit: "hover:before:h-0.5 hover:before:bg-[var(--brand-faceit)]",
  steam: "hover:before:h-0.5 hover:before:bg-[var(--brand-steam)]",
} as const;

export type PlayerSourceCardBrand = keyof typeof SOURCE_CARD_HOVER_COLOR;

export function playerSourceCardClass(
  source: PlayerSourceCardBrand,
  className?: string,
) {
  return cn(
    SOURCE_CARD_HOVER_BORDER,
    SOURCE_CARD_HOVER_COLOR[source],
    className,
  );
}
