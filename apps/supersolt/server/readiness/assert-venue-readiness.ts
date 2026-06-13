import { redirect } from "next/navigation";

import { getServerRequestAuthContext } from "@/server/auth/server-context";
import type { ReadinessModuleId } from "@/entities/readiness/model/types";
import {
  assertVenueModuleReady,
} from "@/server/readiness/readiness.service";
import { ReadinessBlockedError } from "@/server/readiness/readiness.errors";

export async function assertVenueReadinessOrRedirect(
  organisationSlug: string,
  venueSlug: string,
  moduleId: ReadinessModuleId,
): Promise<void> {
  const ctx = await getServerRequestAuthContext();
  if (!ctx) {
    redirect("/auth");
  }

  try {
    await assertVenueModuleReady(ctx, {
      organisationSlug,
      venueSlug,
      moduleId,
    });
  } catch (error) {
    if (error instanceof ReadinessBlockedError) {
      const params = new URLSearchParams({
        readiness: moduleId,
      });
      redirect(
        `/${organisationSlug}/${venueSlug}/dashboard?${params.toString()}`,
      );
    }
    throw error;
  }
}
