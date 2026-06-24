import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

/** Dashboard-style section header: title on the left, optional "View all" link on the right. */
export function NewsSectionHeader({
  title,
  viewAllHref,
  viewAllLabel = "View all",
  className,
}: {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-xs font-medium transition-colors"
        >
          {viewAllLabel}
          <ArrowUpRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
