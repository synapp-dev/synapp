import { Suspense } from "react";
import { generateMetadataFromSegments } from "@/utils/metadata";
import { UsersPageClient } from "./users-page-client";
import { Skeleton } from "@workspace/ui/components/skeleton";

export const metadata = generateMetadataFromSegments([
  "schools",
  "settings",
  "users",
]);

export default async function SettingsUsersPage({
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
      <UsersPageClient schoolSlug={school_id} />
    </Suspense>
  );
}
