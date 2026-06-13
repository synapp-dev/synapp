import { Sparkles } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Scripted superbot narration bubble. Deterministic copy only — intentionally
 * not wired to the live ai-agent-chat runtime.
 */
export function SuperbotStageMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span
        className="bg-[color:var(--brand-supersolt-primary)]/12 text-[color:var(--brand-supersolt-primary)] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--brand-supersolt-primary)]/25"
        aria-hidden
      >
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="bg-muted/50 text-foreground/90 min-w-0 flex-1 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}
