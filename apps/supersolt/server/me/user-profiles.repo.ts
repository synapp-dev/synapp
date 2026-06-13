import { and, eq, isNull } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { userProfiles } from "@/server/db/schema";

export type ActiveUserProfileRow = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  setupCompletedAt: string | null;
};

export const userProfilesRepo = {
  async getActiveProfile(
    tx: RlsTx,
    userId: string,
  ): Promise<ActiveUserProfileRow | null> {
    const rows = await tx
      .select({
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        fullName: userProfiles.fullName,
        avatarUrl: userProfiles.avatarUrl,
        setupCompletedAt: userProfiles.setupCompletedAt,
      })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.id, userId),
          eq(userProfiles.isActive, true),
          isNull(userProfiles.archivedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },
};
