import { redirect } from "next/navigation";
import { lessonsRepo } from "@/server/lessons/lessons.repo";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;
  
  // Fetch lesson to determine the appropriate tab based on status
  const lessonData = await lessonsRepo.getById(lesson_id);
  const lesson = lessonData[0];
  
  // Determine redirect based on lesson status
  if (lesson?.status === "feedback") {
    redirect(`/schools/${school_id}/lessons/${lesson_id}/feedback`);
  }
  
  // Default to prepare tab
  redirect(`/schools/${school_id}/lessons/${lesson_id}/prepare`);
}
