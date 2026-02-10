import { topicLessonPlansRepo } from "./topic-lesson-plans.repo";
import { assertFeature } from "@/server/features/features.service";
import { createServerClient } from "@/utils/supabase/server";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { db } from "@/server/db/drizzle";
import { topics, curriculumStages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

const BUCKET = "content";

function storagePath(
  stageNumber: number,
  topicNumber: number,
  planId: string,
  extension: string
) {
  return `lesson-plans/topics/s${stageNumber}/t${topicNumber}/${planId}.${extension}`;
}

/**
 * Look up the stage number and topic stageOrder for a given topicId.
 * Returns { stageNumber, topicNumber } or throws if not found.
 */
async function getTopicStorageContext(topicId: string) {
  const result = await db
    .select({
      stageCode: curriculumStages.code,
      stageOrder: topics.stageOrder,
    })
    .from(topics)
    .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
    .where(eq(topics.id, topicId))
    .limit(1);

  if (result.length === 0) {
    throw new Error("Topic not found");
  }

  const { stageCode, stageOrder } = result[0];

  const stageNumberMatch = stageCode.match(/^S(\d+)$/);
  if (!stageNumberMatch) {
    throw new Error(`Invalid stage code format: ${stageCode}`);
  }

  const stageNumber = parseInt(stageNumberMatch[1], 10);
  const topicNumber = stageOrder;

  if (topicNumber === null || topicNumber === undefined) {
    throw new Error("Topic stageOrder is missing");
  }

  return { stageNumber, topicNumber };
}

async function assertCanManage(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/content");
}

async function assertCanView(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
}

export const topicLessonPlansService = {
  /** List all lesson plans for a topic */
  async list(ctx: AuthContext, topicId: string) {
    await assertCanView(ctx);
    return topicLessonPlansRepo.listByTopicId(topicId);
  },

  /** Upload a lesson plan PDF and persist metadata */
  async upload(ctx: AuthContext, topicId: string, file: File) {
    await assertCanManage(ctx);

    const extension = file.name.split(".").pop() || "pdf";
    const originalName = file.name;
    const fileSize = file.size;

    // Look up stage/topic numbers for storage path
    const { stageNumber, topicNumber } = await getTopicStorageContext(topicId);

    // 1. Insert row to get UUID
    const [row] = await topicLessonPlansRepo.create({
      topicId,
      fileName: originalName,
      fileUrl: "", // placeholder until upload completes
      fileSize,
      uploadedBy: ctx.userId,
    });

    // 2. Upload file to Supabase Storage
    const filePath = storagePath(stageNumber, topicNumber, row.id, extension);
    const supabase = await createServerClient();

    // Convert File to Buffer for server-side upload (matches bulk-save pattern)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/pdf",
      });

    if (uploadError) {
      // Clean up the DB row if upload fails
      await topicLessonPlansRepo.deleteById(row.id);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // 3. Update row with storage path
    const [updated] = await topicLessonPlansRepo.update(row.id, {
      fileUrl: filePath,
    });

    return updated;
  },

  /** Generate a signed download URL for a lesson plan */
  async getSignedUrl(ctx: AuthContext, planId: string) {
    await assertCanView(ctx);

    const plan = await topicLessonPlansRepo.getById(planId);
    if (!plan) {
      throw new Error("Lesson plan not found");
    }

    const supabase = await createServerClient();

    // Generate signed URL with 1-hour expiry
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(plan.fileUrl, 3600);

    if (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }

    return {
      url: toStorageUrl(data.signedUrl) ?? data.signedUrl,
      fileName: plan.fileName,
    };
  },

  /** Delete a lesson plan (DB row + storage file) */
  async delete(ctx: AuthContext, planId: string) {
    await assertCanManage(ctx);

    const plan = await topicLessonPlansRepo.getById(planId);
    if (!plan) {
      throw new Error("Lesson plan not found");
    }

    // Delete from storage
    if (plan.fileUrl) {
      const supabase = await createServerClient();
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove([plan.fileUrl]);

      if (deleteError) {
        console.warn(
          `Failed to delete storage file for lesson plan ${planId}:`,
          deleteError.message
        );
      }
    }

    // Delete DB row
    await topicLessonPlansRepo.deleteById(planId);

    return { success: true };
  },
};
