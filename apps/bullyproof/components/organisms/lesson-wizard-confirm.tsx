"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { CalendarIcon, ClockIcon, UsersIcon, BookOpenIcon } from "lucide-react";
import type { ClassOption, TopicOption, ScheduleOption } from "@/types/lesson-wizard";

interface LessonWizardConfirmProps {
  selectedClasses: ClassOption[];
  selectedTopic: TopicOption | null;
  scheduleOption: ScheduleOption;
  scheduledDate: string;
  scheduledTime: string;
}

export function LessonWizardConfirm({
  selectedClasses,
  selectedTopic,
  scheduleOption,
  scheduledDate,
  scheduledTime,
}: LessonWizardConfirmProps) {
  const formatDateTime = () => {
    if (scheduleOption === "immediate") {
      return "Starting immediately";
    }

    const date = new Date(`${scheduledDate}T${scheduledTime}`);
    return date.toLocaleString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Confirm Your Selections</h3>
        <p className="text-sm text-muted-foreground">
          Review your lesson details before creating
        </p>
      </div>

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

          {/* Schedule Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClockIcon className="h-4 w-4" />
              <span>Schedule</span>
              <Badge variant={scheduleOption === "immediate" ? "default" : "secondary"}>
                {scheduleOption === "immediate" ? "Immediate" : "Scheduled"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDateTime()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

