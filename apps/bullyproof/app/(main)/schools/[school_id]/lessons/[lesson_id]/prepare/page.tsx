import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { BookOpen, FileText, ClipboardCheck } from "lucide-react";

export default async function LessonPreparePage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Prepare Lesson</h1>
        <p className="text-muted-foreground">
          Get ready for your lesson. Review materials, check resources, and prepare for delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lesson Content */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lesson Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review all lesson slides and materials before starting.
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                  View Slides
                </button>
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90">
                  Download Materials
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent rounded-md transition-colors">
                View Class Roster
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent rounded-md transition-colors">
                Review Accommodations
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent rounded-md transition-colors">
                Check Required Materials
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Materials Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Materials Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Projector & Screen</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Printed Handouts</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Whiteboard Markers</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Supplementary Resources</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

