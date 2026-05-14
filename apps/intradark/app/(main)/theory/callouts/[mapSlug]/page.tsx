import Link from "next/link";
import { notFound } from "next/navigation";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { MapCalloutsEditorClient } from "@/entities/utility-lineups/components/map-callouts-editor-client";
import {
  getMapBySlugAny,
  listMapCalloutsForMap,
} from "@/entities/utility-lineups/lib/queries";

export default async function TheoryCalloutsMapPage({
  params,
}: {
  params: Promise<{ mapSlug: string }>;
}) {
  const { mapSlug } = await params;
  const map = await getMapBySlugAny(mapSlug);
  if (!map) {
    notFound();
  }

  const callouts = await listMapCalloutsForMap(map.id);

  return (
    <MainSectionShell
      title={`Callouts · ${map.displayName}`}
      description="Polygon rings use normalized radar coordinates (0–1), matching utility overlays."
    >
      <p className="text-muted-foreground text-sm">
        <Link href="/theory/callouts" className="text-primary underline-offset-4 hover:underline">
          All maps
        </Link>
      </p>
      <MapCalloutsEditorClient
        map={{
          id: map.id,
          slug: map.slug,
          displayName: map.displayName,
          radarImageUrl: map.radarImageUrl,
        }}
        initialCallouts={callouts}
      />
    </MainSectionShell>
  );
}
