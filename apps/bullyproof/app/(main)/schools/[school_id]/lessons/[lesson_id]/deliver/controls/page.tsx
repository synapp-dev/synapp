import { ControlMode } from "@/components/organisms/control-mode";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "schools",
  "lessons",
  "run-lesson",
  "controls",
]);

export default async function LessonRunLessonControlsPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { lesson_id } = await params;

  return <ControlMode lessonId={lesson_id} />;
}
