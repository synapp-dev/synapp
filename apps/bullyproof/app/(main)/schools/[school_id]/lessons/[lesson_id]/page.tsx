import { redirect } from "next/navigation";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;
  redirect(`/schools/${school_id}/lessons/${lesson_id}/prepare`);
}
