import { cn } from "@workspace/ui/lib/utils";

/** Tailwind classes for roster position badges (venue `positions.slug`). */
export const POSITION_BADGE_CLASSES: Record<string, string> = {
  chef: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  sous: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  cdp: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  foh: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bar: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  host: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  manager: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export const POSITION_SHORT_LABELS: Record<string, string> = {
  chef: "Chef",
  sous: "Sous",
  cdp: "CDP",
  foh: "FOH",
  bar: "Bar",
  host: "Host",
  manager: "Mgr",
};

export function positionBadgeClass(slug: string): string {
  return cn(
    POSITION_BADGE_CLASSES[slug] ?? "bg-muted text-muted-foreground dark:bg-muted/60"
  );
}

export function positionShortLabel(slug: string, displayName?: string | null): string {
  return POSITION_SHORT_LABELS[slug] ?? displayName ?? slug;
}
