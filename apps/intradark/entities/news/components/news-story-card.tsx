import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";

import { NewsTagChips } from "@/entities/news/components/news-tag-chip";
import type { ArticleTag } from "@/entities/news/lib/queries";

/** Compact secondary story card for the news grid. */
export function NewsStoryCard({
  slug,
  title,
  excerpt,
  coverImageUrl,
  publishedAt,
  tags = [],
}: {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl?: string | null;
  publishedAt: string;
  tags?: ArticleTag[];
}) {
  const dateLabel = format(new Date(publishedAt), "MMM d, yyyy");
  const hasCover = Boolean(coverImageUrl && coverImageUrl.trim().length > 0);

  return (
    <Link
      href={`/news/${slug}`}
      className="group bg-card hover:border-foreground/20 relative flex h-full flex-col overflow-hidden rounded-xl border transition-colors"
    >
      {hasCover ? (
        <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN media */}
          <img
            src={coverImageUrl as string}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            aria-hidden
          />
        </div>
      ) : null}

      <div className="group-hover:bg-accent/30 flex flex-1 flex-col gap-2 p-5 transition-colors">
        <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
          <span className="tracking-wide uppercase">{dateLabel}</span>
          <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <h3 className="text-lg leading-snug font-semibold tracking-tight line-clamp-2">
          {title}
        </h3>
        {excerpt ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{excerpt}</p>
        ) : null}
        {tags.length > 0 ? <NewsTagChips tags={tags} className="mt-auto flex flex-wrap gap-1.5 pt-1" /> : null}
      </div>
    </Link>
  );
}
