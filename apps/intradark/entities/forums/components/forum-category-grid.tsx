import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type Category = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
};

export function ForumCategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <Link key={c.id} href={`/forums/${c.slug}`} className="block">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-lg">{c.label}</CardTitle>
              {c.description ? (
                <CardDescription>{c.description}</CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
