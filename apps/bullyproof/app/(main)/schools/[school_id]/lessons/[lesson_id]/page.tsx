import { redirect } from "next/navigation";
import { lessonsRepo } from "@/server/lessons/lessons.repo";
import { getDefaultPagePath } from "@/lib/lesson-lifecycle";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  const lessonData = await lessonsRepo.getById(lesson_id);
  const lesson = lessonData[0];

  redirect(getDefaultPagePath(school_id, lesson_id, lesson?.status));
}
