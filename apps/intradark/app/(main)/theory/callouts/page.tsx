import Link from "next/link";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { listMapsWithPoolsForAdmin } from "@/entities/utility-lineups/lib/queries";

export default async function TheoryCalloutsIndexPage() {
  const rows = await listMapsWithPoolsForAdmin();

  return (
    <MainSectionShell
      title="Theory · Callout zones"
      description="Draw radar polygons for map callouts (normalized coordinates). Developer role only."
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No maps in the catalog yet. Add rows to <code className="text-xs">public.maps</code> first.
        </p>
      ) : (
        <ul className="max-w-md divide-y divide-border rounded-md border">
          {rows.map(({ map }) => (
            <li key={map.id}>
              <Link
                href={`/theory/callouts/${map.slug}`}
                className="hover:bg-muted/50 flex items-center justify-between gap-2 px-4 py-3 text-sm transition-colors"
              >
                <span className="font-medium">{map.displayName}</span>
                <code className="text-muted-foreground text-xs">{map.slug}</code>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MainSectionShell>
  );
}
