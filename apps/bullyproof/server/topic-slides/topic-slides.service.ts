import { topicSlidesRepo } from "./topic-slides.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { refreshSignedUrlIfStale } from "@/server/lib/signed-url";
import { db } from "@/server/db/drizzle";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";

type AuthContext = {
  userId: string | null;
};

export const topicSlidesService = {
  async getSlidesByTopicId(ctx: AuthContext, topicId: string) {
    // Determine if this is a certification topic or curriculum topic
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

    // Pick the correct update function for caching signed URLs
    const updateFn = isCertification
      ? courseTopicSlidesRepo.updateSignedUrl
      : topicSlidesRepo.updateSignedUrl;

    // Resolve signed URLs for all slides in parallel.
    // Uses DB-cached URLs when fresh (< 30 min), otherwise generates new ones.
    // image_url / video_url are already Supabase Storage paths — no path reconstruction needed.
    const slidesWithUrls = await Promise.all(
      slides.map(async (slide) => {
        const signedImageUrl = await refreshSignedUrlIfStale(
          slide,
          slide.imageUrl,
          updateFn
        );
        const signedVideoUrl = await refreshSignedUrlIfStale(
          slide,
          slide.videoUrl,
          updateFn
        );

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
