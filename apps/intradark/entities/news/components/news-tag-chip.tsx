import { Badge } from "@workspace/ui/components/badge";

import type { ArticleTag } from "@/entities/news/lib/queries";

/** Small inline tag chips for news cards / article header. */
export function NewsTagChips({
  tags,
  className,
}: {
  tags: ArticleTag[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {tags.map((t) => (
        <Badge key={t.slug} variant="secondary" className="text-[10px] font-medium">
          {t.label}
        </Badge>
      ))}
    </div>
  );
}
