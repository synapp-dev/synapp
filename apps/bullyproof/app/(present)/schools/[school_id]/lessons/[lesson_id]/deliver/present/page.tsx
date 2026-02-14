import { PresentationMode } from "@/components/organisms/presentation-mode";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "schools",
  "lessons",
  "run-lesson",
  "present",
]);

export default async function LessonRunLessonPresentPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return (
    <PresentationMode lessonId={lesson_id} schoolSlug={school_id} />
  );
}
