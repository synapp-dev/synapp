import { LessonFeedbackForm } from "@/components/organisms/lesson-feedback-form";


export default async function LessonFeedbackPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Lesson Feedback</h1>
        <p className="text-muted-foreground">
          Share your experience and mark this lesson as completed.
        </p>
      </div>

      <LessonFeedbackForm lessonId={lesson_id} />
    </div>
  );
}
