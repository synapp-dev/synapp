import { Suspense } from "react";
import { generateMetadataFromSegments } from "@/utils/metadata";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ClassesPageClient } from "./classes-page-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "settings",
  "classes",
]);

export default async function SettingsClassesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ClassesPageClient schoolSlug={school_id} />
    </Suspense>
  );
}
