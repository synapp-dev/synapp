import { cn } from "@workspace/ui/lib/utils";

/**
 * Superbot speech bubble — mirrors the dashboard recommendation bubble
 * (rounded-2xl, bordered, soft muted fill, shadow). The little tail points up
 * when the bubble sits under the bot video, or left when the bot is beside it.
 */
export function SuperbotSpeechBubble({
  children,
  className,
  tail = "up",
}: {
  children: React.ReactNode;
  className?: string;
  tail?: "up" | "left";
}) {
  return (
    <div
      className={cn(
        "border-border bg-muted/45 dark:bg-muted/25 relative rounded-2xl border px-6 py-4 shadow-md",
        className,
      )}
    >
      {tail === "up" ? (
        <span
          aria-hidden
          className="border-b-muted/45 dark:border-b-muted/25 absolute bottom-full left-1/2 block h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent"
        />
      ) : (
        <span
          aria-hidden
          className="border-r-muted/45 dark:border-r-muted/25 absolute right-full top-5 block h-0 w-0 border-y-[7px] border-r-[9px] border-y-transparent"
        />
      )}
      {children}
    </div>
  );
}
