import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { NewsArticleBodyHtml } from "@/entities/news/components/news-article-body-html";
import { NewsTagChips } from "@/entities/news/components/news-tag-chip";
import {
  getPublishedArticleBySlug,
  getTagsForArticleIds,
} from "@/entities/news/lib/queries";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Separator } from "@workspace/ui/components/separator";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const tags = (await getTagsForArticleIds([article.id])).get(article.id) ?? [];
  const publishedLabel = article.publishedAt
    ? format(new Date(article.publishedAt), "MMMM d, yyyy")
    : "";
  const authorName =
    article.authorDisplayName ?? article.authorUsername ?? "Intradark";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <article className="mx-auto w-full max-w-2xl pb-16">
      <Link
        href="/news"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="size-4" />
        All news
      </Link>

      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-[2.6rem] md:leading-[1.12]">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="text-muted-foreground text-xl leading-snug">
            {article.excerpt}
          </p>
        ) : null}

        {tags.length > 0 ? <NewsTagChips tags={tags} /> : null}

        <div className="flex items-center gap-3 pt-1">
          <Avatar className="size-9">
            {article.authorAvatarUrl ? (
              <AvatarImage src={article.authorAvatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{authorInitial}</AvatarFallback>
          </Avatar>
          <div className="text-sm leading-tight">
            <p className="font-medium">{authorName}</p>
            {publishedLabel ? (
              <p className="text-muted-foreground text-xs">{publishedLabel}</p>
            ) : null}
          </div>
        </div>
      </header>

      <Separator className="my-8" />

      {article.coverImageUrl ? (
        <div className="bg-muted relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN media */}
          <img
            src={article.coverImageUrl}
            alt=""
            className="size-full object-cover"
            aria-hidden
          />
        </div>
      ) : null}

      <div className="font-[Georgia,'Times_New_Roman',serif]">
        <NewsArticleBodyHtml doc={article.bodyJson} />
      </div>
    </article>
  );
}
