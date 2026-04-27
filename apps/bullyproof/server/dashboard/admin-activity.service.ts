import { assertFeature } from "@/server/features/features.service";
import { SYSTEM_FEATURES } from "@/lib/feature-keys";
import {
  adminActivityRepo,
  type AdminActivityFeedItem,
} from "./admin-activity.repo";

type AuthContext = { userId: string | null };

export const adminActivityService = {
  async listRecentActivity(ctx: AuthContext): Promise<AdminActivityFeedItem[]> {
    await assertFeature(ctx, SYSTEM_FEATURES.ADMIN_ACCESS);
    return adminActivityRepo.listRecentActivity();
  },
};
