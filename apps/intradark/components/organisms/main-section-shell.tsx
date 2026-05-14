import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function MainSectionShell({
  title,
  description,
  titleBadgeUrl,
  children,
}: {
  title: string;
  description?: string;
  /** Optional image shown to the left of the title (e.g. utility map badge). */
  titleBadgeUrl?: string | null;
  children?: ReactNode;
}) {
  const showBadge =
    typeof titleBadgeUrl === "string" && titleBadgeUrl.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {showBadge ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN map assets */
          <img
            src={titleBadgeUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-contain"
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-1">{description}</p>
          ) : null}
        </div>
      </div>
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>This area is under construction.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We are still building this part of Intradark. Check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
