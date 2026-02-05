import { LessonSidebarNav } from "@/components/organisms/lesson-sidebar-nav";
import { LessonHeader } from "@/components/organisms/lesson-header";
import { LessonStatusRedirect } from "@/components/organisms/lesson-status-redirect";

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-theme(spacing.12))]">
      {/* Lesson Header - Fixed at top with muted background */}
      <div className="flex-shrink-0">
        <LessonHeader lessonId={lesson_id} />
      </div>
      
      {/* Content area with sidebar and main content */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Lesson Navigation Sidebar - Rounded card, fixed height fit */}
        <aside className="w-56 flex-shrink-0 flex items-start">
          <div className="bg-background rounded-lg p-4 h-fit w-full">
            <LessonSidebarNav schoolId={school_id} lessonId={lesson_id} />
          </div>
        </aside>
        
        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-auto min-w-0 mt-6 rounded-lg border p-6">
          <LessonStatusRedirect schoolId={school_id} lessonId={lesson_id}>
            {children}
          </LessonStatusRedirect>
        </div>
      </div>
    </div>
  );
}

