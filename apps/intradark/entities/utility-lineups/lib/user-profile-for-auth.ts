import { eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { userProfiles } from "@/server/db/schema";

export async function getUserProfileIdForAuthUser(
  authUserId: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, authUserId))
    .limit(1);
  return rows[0]?.id ?? null;
}
