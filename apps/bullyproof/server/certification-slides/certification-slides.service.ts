import {
  createCertificationSlideSchema,
  updateCertificationSlideSchema,
  bulkSaveCertificationSlidesSchema,
  type CreateCertificationSlideParams,
  type UpdateCertificationSlideParams,
  type BulkSaveCertificationSlidesParams,
} from "./certification-slides.validators";
import { certificationSlidesRepo } from "./certification-slides.repo";
import { certificationTopicsRepo } from "../certification-topics/certification-topics.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { certificationTopics, certificationStages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageCertificationSlides(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  if (!roles.platform.includes("PLATFORM_ADMIN")) {
    throw new Error("Unauthorized to manage certification slides");
  }
}

async function assertCanViewCertificationSlides(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  // All authenticated users can view certification slides
}

export const certificationSlidesService = {
  async getSlidesByTopicId(ctx: AuthContext, topicId: string) {
    await assertCanViewCertificationSlides(ctx);
    
    // Get slides from repo
    const slides = await certificationSlidesRepo.getByTopicId(topicId);
    
    if (slides.length === 0) {
      return slides;
    }
    
    // Get topic and stage info for file path construction
    const topicResult = await certificationTopicsRepo.getById(topicId);
    if (topicResult.length === 0) {
      return slides;
    }
    
    const topic = topicResult[0];
    
    // Get stage info
    const stageResult = await db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.id, topic.stageId))
      .limit(1);
    
    if (stageResult.length === 0) {
      return slides;
    }
    
    const stage = stageResult[0];
    const stageCode = stage.code;
    
    // Generate signed URLs for image slides
    const supabase = await createServerClient();
    const slidesWithUrls = await Promise.all(
      slides.map(async (slide) => {
        if (slide.kind !== "image" || !slide.imageUrl) {
          return slide;
        }
        
        // Extract file extension from stored imageUrl or use default
        let fileExtension = "jpg"; // default
        if (slide.imageUrl) {
          const urlMatch = slide.imageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
          if (urlMatch) {
            fileExtension = urlMatch[1];
          }
        }
        
        // Construct file path: slides/certification/{stageCode}/{topicId}/{slideId}.{extension}
        // Using topic ID instead of order number makes paths stable when topics are reordered
        const fileName = `${slide.id}.${fileExtension}`;
        const filePath = `slides/certification/${stageCode}/${topicId}/${fileName}`;
        
        // Check if file exists in storage
        const { data: fileList, error: listError } = await supabase.storage
          .from("content")
          .list(`slides/certification/${stageCode}/${topicId}/`);
        
        if (listError) {
          console.warn(
            `Failed to list files for certification slide ${slide.id}:`,
            listError.message
          );
          return { ...slide, signedUrl: null };
        }
        
        const fileExists =
          fileList && fileList.some((file) => file.name === fileName);
        
        if (!fileExists) {
          return { ...slide, signedUrl: null };
        }
        
        // Generate signed URL with 1-week expiry (604800 seconds)
        const { data, error } = await supabase.storage
          .from("content")
          .createSignedUrl(filePath, 604800);
        
        if (error) {
          console.warn(
            `Failed to generate signed URL for certification slide ${slide.id}:`,
            error.message
          );
          return { ...slide, signedUrl: null };
        }
        
        return { ...slide, signedUrl: data.signedUrl };
      })
    );
    
    return slidesWithUrls;
  },

  async createSlide(ctx: AuthContext, params: unknown) {
    const data: CreateCertificationSlideParams =
      createCertificationSlideSchema.parse(params);
    await assertCanManageCertificationSlides(ctx);

    // Ensure quizData is set for quiz slides
    if (data.kind === "quiz" && !data.quizData) {
      throw new Error("Quiz slides require quizData");
    }

    const newSlide = await certificationSlidesRepo.createSlide(data);

    // Normalize slide order after creation
    await certificationSlidesRepo.normalizeSlideOrder(data.topicId);

    return newSlide[0];
  },

  async updateSlide(ctx: AuthContext, slideId: string, params: unknown) {
    const data: UpdateCertificationSlideParams =
      updateCertificationSlideSchema.parse(params);
    await assertCanManageCertificationSlides(ctx);

    // Ensure quizData is set if changing to quiz type
    if (data.kind === "quiz" && !data.quizData) {
      // If updating to quiz but no quizData provided, check if slide already has quizData
      const existingSlide = await certificationSlidesRepo.getById(slideId);
      if (existingSlide.length === 0) {
        throw new Error("Slide not found");
      }
      if (!existingSlide[0].quizData) {
        throw new Error("Quiz slides require quizData");
      }
    }

    const updated = await certificationSlidesRepo.updateSlide(slideId, data);
    if (updated.length === 0) {
      throw new Error("Slide not found");
    }

    // Normalize slide order if orderIndex changed
    if (data.orderIndex !== undefined) {
      const slide = updated[0];
      await certificationSlidesRepo.normalizeSlideOrder(slide.topicId);
    }

    return updated[0];
  },

  async deleteSlide(ctx: AuthContext, slideId: string) {
    await assertCanManageCertificationSlides(ctx);

    const slide = await certificationSlidesRepo.getById(slideId);
    if (slide.length === 0) {
      throw new Error("Slide not found");
    }

    await certificationSlidesRepo.deleteSlide(slideId);

    // Normalize slide order after deletion
    await certificationSlidesRepo.normalizeSlideOrder(slide[0].topicId);

    return { success: true };
  },

  async bulkSave(ctx: AuthContext, params: unknown) {
    const data: BulkSaveCertificationSlidesParams =
      bulkSaveCertificationSlidesSchema.parse(params);
    await assertCanManageCertificationSlides(ctx);

    // This will be handled by the API route with file uploads
    // Service just validates the data structure
    return data;
  },

  async getSlideImageUrl(ctx: AuthContext, slideId: string) {
    await assertCanViewCertificationSlides(ctx);

    const slideData =
      await certificationSlidesRepo.getSlideWithTopicAndStage(slideId);
    if (!slideData) {
      throw new Error("Slide not found");
    }

    const { slide, topic, stage } = slideData;

    // Only generate URL for image slides
    if (slide.kind !== "image") {
      throw new Error("Slide is not an image slide");
    }

    // Get stage code (e.g., "C", "C1")
    const stageCode = stage.code;

    // Extract file extension from stored imageUrl or use default
    // If imageUrl exists and has an extension, extract it
    let fileExtension = "jpg"; // default
    if (slide.imageUrl) {
      const urlMatch = slide.imageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        fileExtension = urlMatch[1];
      }
    }

    // Construct file path: slides/certification/{stageCode}/{topicId}/{slideId}.{extension}
    // Using topic ID instead of order number makes paths stable when topics are reordered
    const fileName = `${slideId}.${fileExtension}`;
    const filePath = `slides/certification/${stageCode}/${topic.id}/${fileName}`;

    // Check if file exists in storage before generating signed URL
    const supabase = await createServerClient();

    // First, check if the file exists by listing files in the directory
    const { data: fileList, error: listError } = await supabase.storage
      .from("content")
      .list(`slides/certification/${stageCode}/${topic.id}/`);

    // Check if the file exists in the list
    const fileExists =
      !listError && fileList && fileList.some((file) => file.name === fileName);

    if (!fileExists) {
      // File doesn't exist in bucket, return null to indicate no image
      return { url: null };
    }

    // File exists, generate signed URL with 1-week expiry (604800 seconds)
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(filePath, 604800); // 1 week in seconds

    if (error) {
      // If there's an error generating the signed URL, return null instead of throwing
      // This handles cases where the file might have been deleted between checking and generating
      console.warn(
        `Failed to generate signed URL for certification slide ${slideId}:`,
        error.message
      );
      return { url: null };
    }

    return { url: data.signedUrl };
  },
};
