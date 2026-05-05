import Link from "next/link";
import { format } from "date-fns";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function NewsArticleCard({
  slug,
  title,
  excerpt,
  publishedAt,
}: {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
}) {
  const dateLabel = format(new Date(publishedAt), "MMM d, yyyy");
  return (
    <Link href={`/news/${slug}`} className="block transition-opacity hover:opacity-90">
      <Card className="h-full">
        <CardHeader>
          <p className="text-xs text-muted-foreground mb-1">{dateLabel}</p>
          <CardTitle className="text-xl">{title}</CardTitle>
          {excerpt ? (
            <CardDescription className="line-clamp-3">{excerpt}</CardDescription>
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  );
}
