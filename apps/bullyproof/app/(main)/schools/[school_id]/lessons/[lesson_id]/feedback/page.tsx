import { LessonFeedbackForm } from "@/components/organisms/lesson-feedback-form";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "schools",
  "lessons",
  "feedback",
]);

export default async function LessonFeedbackPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return <LessonFeedbackForm lessonId={lesson_id} schoolSlug={school_id} />;
}
