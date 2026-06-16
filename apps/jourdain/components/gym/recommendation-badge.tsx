import { Sparkles } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

/** Small inline hint for a heuristic recommendation (load / set count). */
export function RecommendationBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
