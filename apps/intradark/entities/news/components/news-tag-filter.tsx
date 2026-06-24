import Link from "next/link";

import { cn } from "@workspace/ui/lib/utils";
import type { ArticleTag } from "@/entities/news/lib/queries";

/** Reader-facing tag filter row for /news (links set ?tag=slug). */
export function NewsTagFilter({
  tags,
  active,
}: {
  tags: ArticleTag[];
  active?: string;
}) {
  if (tags.length === 0) return null;
  const base =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const activeCls = "bg-foreground text-background border-foreground";
  const idleCls = "text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/news"
        className={cn(base, !active ? activeCls : idleCls)}
      >
        All
      </Link>
      {tags.map((t) => (
        <Link
          key={t.slug}
          href={`/news?tag=${t.slug}`}
          className={cn(base, active === t.slug ? activeCls : idleCls)}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
