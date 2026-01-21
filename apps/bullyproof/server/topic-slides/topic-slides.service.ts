import { topicSlidesRepo } from "./topic-slides.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import {
  courseTopics,
  topics,
  certificationCourses,
  curriculumStages,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";

type AuthContext = {
  userId: string | null;
};

export const topicSlidesService = {
  async getSlidesByTopicId(ctx: AuthContext, topicId: string) {
    // Determine if this is a certification topic (courseTopics) or curriculum topic (topics)
    const courseTopicResult = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    const isCertification = courseTopicResult.length > 0;
    
    // Use the appropriate repository based on topic type
    const slides = isCertification
      ? await courseTopicSlidesRepo.getByTopicId(topicId)
      : await topicSlidesRepo.getByTopicId(topicId);

    if (slides.length === 0) {
      return slides;
    }

    let stageCode: string | null = null;
    let stageNumber: number | null = null;
    let topicNumber: number | null = null;

    if (isCertification) {
      // Certification topic: Get course to get course code (acts as stageCode)
      const course = await db
        .select()
        .from(certificationCourses)
        .where(eq(certificationCourses.id, courseTopicResult[0].courseId))
        .limit(1);

      if (course.length > 0) {
        stageCode = course[0].code;
      }
    } else {
      // Curriculum topic: Get topic and stage info
      const topicResult = await db
        .select()
        .from(topics)
        .where(eq(topics.id, topicId))
        .limit(1);

      if (topicResult.length > 0) {
        const topic = topicResult[0];
        topicNumber = topic.stageOrder ?? null;

        // Get stage to extract stage number
        const stageResult = await db
          .select()
          .from(curriculumStages)
          .where(eq(curriculumStages.id, topic.stageId))
          .limit(1);

        if (stageResult.length > 0) {
          const stageCodeMatch = stageResult[0].code.match(/^S(\d+)$/);
          if (stageCodeMatch) {
            stageNumber = parseInt(stageCodeMatch[1], 10);
          }
        }
      }
    }

    // Generate signed URLs for image and video slides
    const supabase = await createServerClient();
    const slidesWithUrls = await Promise.all(
      slides.map(async (slide) => {
        let signedImageUrl = slide.imageUrl;
        let signedVideoUrl = slide.videoUrl;

        // Helper function to generate signed URL for a file
        const generateSignedUrl = async (
          url: string | null,
          slideId: string,
          isImage: boolean
        ): Promise<string | null> => {
          if (!url) return null;

          // Skip data URLs and blob URLs
          if (url.startsWith("data:") || url.startsWith("blob:")) {
            return url;
          }

          try {
            // Extract file extension from URL or use default
            let fileExtension = isImage ? "jpg" : "mp4";
            const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            if (urlMatch) {
              fileExtension = urlMatch[1];
            }

            // Construct file path based on topic type
            let filePath: string;
            if (isCertification && stageCode) {
              // Certification: slides/certification/{courseCode}/{topicId}/{slideId}.{extension}
              const fileName = `${slideId}.${fileExtension}`;
              filePath = `slides/certification/${stageCode}/${topicId}/${fileName}`;
            } else if (!isCertification && stageNumber !== null && topicNumber !== null) {
              // Curriculum: slides/topics/s{stageNumber}/t{topicNumber}/{slideId}.{extension}
              const fileName = `${slideId}.${fileExtension}`;
              filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;
            } else {
              // Can't determine path, return original URL
              console.warn(
                `Cannot determine storage path for slide ${slideId}, topic ${topicId}`
              );
              return url;
            }

            // Check if file exists in storage
            const directoryPath = filePath.substring(0, filePath.lastIndexOf("/"));
            const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
            const { data: fileList, error: listError } = await supabase.storage
              .from("content")
              .list(directoryPath);

            if (listError) {
              console.warn(
                `Failed to list files for slide ${slideId}:`,
                listError.message
              );
              return url;
            }

            const fileExists =
              fileList && fileList.some((file) => file.name === fileName);

            if (!fileExists) {
              return null;
            }

            // Generate signed URL with 1-week expiry (604800 seconds)
            const { data, error } = await supabase.storage
              .from("content")
              .createSignedUrl(filePath, 604800);

            if (error) {
              console.warn(
                `Failed to generate signed URL for slide ${slideId}:`,
                error.message
              );
              return url;
            }

            return data.signedUrl;
          } catch (error) {
            console.error(`Error generating signed URL for slide ${slideId}:`, error);
            return url;
          }
        };

        // Generate signed URLs for image and video
        if (slide.imageUrl) {
          signedImageUrl = await generateSignedUrl(
            slide.imageUrl,
            slide.id,
            true
          );
        }

        if (slide.videoUrl) {
          signedVideoUrl = await generateSignedUrl(
            slide.videoUrl,
            slide.id,
            false
          );
        }

        return {
          ...slide,
          signedImageUrl,
          signedVideoUrl,
        };
      })
    );

    return slidesWithUrls;
  },
};
