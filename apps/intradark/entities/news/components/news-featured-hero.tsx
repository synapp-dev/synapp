import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Flame } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

import type { ArticleTag } from "@/entities/news/lib/queries";

/** Large lead story for the top of the news landing page. */
export function NewsFeaturedHero({
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
  const dateLabel = format(new Date(publishedAt), "EEEE, MMM d, yyyy");
  const hasCover = Boolean(coverImageUrl && coverImageUrl.trim().length > 0);

  return (
    <Link
      href={`/news/${slug}`}
      className="group focus-visible:ring-ring relative block overflow-hidden rounded-2xl border focus-visible:ring-2 focus-visible:outline-none"
    >
      {hasCover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN media */}
          <img
            src={coverImageUrl as string}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
        </>
      ) : (
        <>
          {/* layered fallback background */}
          <div className="from-muted/60 via-background to-background absolute inset-0 bg-gradient-to-br" />
          <div className="bg-foreground/5 absolute -top-24 -right-20 size-72 rounded-full blur-3xl" />
          <div className="bg-foreground/[0.04] absolute -bottom-28 -left-16 size-72 rounded-full blur-3xl" />
        </>
      )}

      <div
        className={
          hasCover
            ? "relative flex min-h-[340px] flex-col justify-end gap-5 p-6 text-white sm:p-9 md:min-h-[420px] md:p-11"
            : "relative flex min-h-[300px] flex-col justify-end gap-5 p-6 sm:p-9 md:min-h-[340px] md:p-11"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={
              hasCover
                ? "w-fit gap-1.5 border-white/20 bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm"
                : "w-fit gap-1.5 px-2.5 py-1"
            }
          >
            <Flame className="size-3.5" />
            Featured story
          </Badge>
          {tags.slice(0, 2).map((t) => (
            <Badge
              key={t.slug}
              variant="outline"
              className={
                hasCover
                  ? "border-white/30 text-[10px] font-medium text-white/90"
                  : "text-[10px] font-medium"
              }
            >
              {t.label}
            </Badge>
          ))}
        </div>

        <div className="space-y-3">
          <p
            className={
              hasCover
                ? "text-xs font-medium tracking-wider text-white/80 uppercase"
                : "text-muted-foreground text-xs font-medium tracking-wider uppercase"
            }
          >
            {dateLabel}
          </p>
          <h1 className="max-w-3xl text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {excerpt ? (
            <p
              className={
                hasCover
                  ? "max-w-xl line-clamp-2 text-base text-white/85"
                  : "text-muted-foreground max-w-xl line-clamp-2 text-base"
              }
            >
              {excerpt}
            </p>
          ) : null}
        </div>

        <span
          className={
            hasCover
              ? "inline-flex items-center gap-1.5 text-sm font-semibold text-white"
              : "text-foreground inline-flex items-center gap-1.5 text-sm font-semibold"
          }
        >
          Read story
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
