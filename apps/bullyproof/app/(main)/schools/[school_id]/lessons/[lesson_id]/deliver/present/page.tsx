import { PresentationMode } from "@/components/organisms/presentation-mode";

export default async function LessonDeliverPresentPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return <PresentationMode lessonId={lesson_id} />;
}

