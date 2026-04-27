import { assertFeature } from "@/server/features/features.service";
import { curriculumRepo } from "@/server/curriculum/curriculum.repo";
import {
  adminRatingsRepo,
  type AdminRatingsStageSummary,
  type AdminStageLessonRatingRow,
} from "./admin-ratings.repo";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

export type AdminRatingsStage = {
  id: string;
  slug: string;
  code: string;
  name: string;
  sortIndex: number;
};

export type AdminRatingsStageResponse = {
  stage: AdminRatingsStage;
  rows: AdminStageLessonRatingRow[];
};

async function assertCanViewAdminRatings(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/ratings");
}

export const adminRatingsService = {
  async listStageSummaries(ctx: AuthContext): Promise<AdminRatingsStageSummary[]> {
    await assertCanViewAdminRatings(ctx);
    return adminRatingsRepo.getStageSummaries();
  },

  async listRatingsByStageSlug(
    ctx: AuthContext,
    stageSlug: string
  ): Promise<AdminRatingsStageResponse | null> {
    await assertCanViewAdminRatings(ctx);

    const stage = await curriculumRepo.getStageBySlug(stageSlug);
    const stageRow = stage[0];
    if (!stageRow) {
      return null;
    }

    const rows = await adminRatingsRepo.getRatingsByStageSlug(stageSlug);
    return {
      stage: {
        id: stageRow.id,
        slug: stageRow.slug,
        code: stageRow.code,
        name: stageRow.name,
        sortIndex: stageRow.sortIndex,
      },
      rows,
    };
  },
};
