import { ControlMode } from "@/components/organisms/control-mode";

export default async function LessonDeliverControlsPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return <ControlMode lessonId={lesson_id} />;
}

