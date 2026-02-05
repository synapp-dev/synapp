"use client";

import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useMeStore } from "@/entities/me/model/store";
import { Spinner } from "@workspace/ui/components/spinner";

/**
 * Waits for the current user and feature permissions to be loaded before
 * rendering children. This prevents flashing wrong content or redirects
 * before permissions are available (e.g. admin UI before FeatureGuard runs).
 *
 * - Shows a loading state while the /api/me request is in flight.
 * - Also waits until the me store is updated with the user (avoids one frame
 *   where query has data but store is still null).
 */
export function PermissionsReadyGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: userData, isLoading } = useCurrentUser();
  const currentUser = useMeStore((s) => s.currentUser);

  // Ready when: not loading, and either no user (API returned null) or store is synced
  const storeSynced =
    userData === null || userData === undefined || currentUser !== null;
  const ready = !isLoading && storeSynced;

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
