"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { UsersIcon, BookOpenIcon } from "lucide-react";
import type { ClassOption, TopicOption } from "@/types/lesson-wizard";

interface LessonWizardConfirmProps {
  selectedClasses: ClassOption[];
  selectedTopic: TopicOption | null;
}

export function LessonWizardConfirm({
  selectedClasses,
  selectedTopic,
}: LessonWizardConfirmProps) {

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Lesson Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Classes Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UsersIcon className="h-4 w-4" />
              <span>Classes</span>
              <Badge variant="secondary">{selectedClasses.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedClasses.map((cls) => (
                <Badge key={cls.id} variant="outline">
                  {cls.name} ({cls.yearLevel})
                </Badge>
              ))}
            </div>
          </div>

          {/* Topic Section */}
          {selectedTopic && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpenIcon className="h-4 w-4" />
                <span>Topic</span>
              </div>
              <div className="rounded-lg border p-3 bg-accent/30">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{selectedTopic.title}</h4>
                  <Badge variant="outline">{selectedTopic.stageCode}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedTopic.description}
                </p>
                <Badge variant="secondary">{selectedTopic.slideCount} slides</Badge>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

