import { LessonSidebarNav } from "@/components/organisms/lesson-sidebar-nav";

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return (
    <div className="flex gap-6 h-fit -mx-6 -my-3">
      {/* Lesson Navigation Sidebar */}
      <aside className="w-56 border-r bg-background sticky top-[calc(theme(spacing.16)+theme(spacing.12))] self-start z-30 h-[calc(100vh-theme(spacing.16)-theme(spacing.12)-theme(spacing.2))] py-4 pl-6">
        <LessonSidebarNav schoolId={school_id} lessonId={lesson_id} />
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto pr-6 h-fit">
        {children}
      </div>
    </div>
  );
}

