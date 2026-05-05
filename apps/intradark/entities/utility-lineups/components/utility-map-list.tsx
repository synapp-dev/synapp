import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export type UtilityMapListItem = {
  slug: string;
  displayName: string;
};

export function UtilityMapList({ maps }: { maps: UtilityMapListItem[] }) {
  if (maps.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-lg border border-dashed py-12 text-center">
        No maps in the utility catalog yet. Check back after we publish radar
        data.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {maps.map((m) => (
        <li key={m.slug}>
          <Link href={`/utility/${m.slug}`} className="block h-full">
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <CardTitle>{m.displayName}</CardTitle>
                <CardDescription>View smokes, molotovs, and more</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
