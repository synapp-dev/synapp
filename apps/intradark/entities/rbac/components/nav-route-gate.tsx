import type { ReactNode } from "react";

import { assertNavSegmentAccess } from "@/entities/rbac/lib/assert-route-access";

/**
 * Wrap a route segment layout; `segment` is the first path segment (e.g. `dashboard`, `play`).
 */
export async function NavRouteGate({
  segment,
  staffSegment,
  children,
}: {
  segment: string;
  staffSegment?: boolean;
  children: ReactNode;
}) {
  await assertNavSegmentAccess(`/${segment}`, { staffSegment });
  return children;
}
