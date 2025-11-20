"use client";

import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Input } from "@workspace/ui/components/input";
import type { ScheduleOption } from "@/types/lesson-wizard";

interface LessonWizardScheduleProps {
  scheduleOption: ScheduleOption;
  scheduledDate: string;
  scheduledTime: string;
  onScheduleChange: (option: ScheduleOption) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function LessonWizardSchedule({
  scheduleOption,
  scheduledDate,
  scheduledTime,
  onScheduleChange,
  onDateChange,
  onTimeChange,
}: LessonWizardScheduleProps) {
  const isScheduled = scheduleOption === "scheduled";
  
  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Schedule Lesson</h3>
        <p className="text-sm text-muted-foreground">
          Choose when to start this lesson
        </p>
      </div>

      <RadioGroup
        value={scheduleOption}
        onValueChange={(value) => onScheduleChange(value as ScheduleOption)}
        className="flex flex-col gap-4"
      >
        <div className="flex items-start gap-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="immediate" id="immediate" />
          <div className="flex-1">
            <Label htmlFor="immediate" className="font-medium cursor-pointer">
              Start Immediately
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Begin the lesson right away. Status will be set to "In Progress".
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="scheduled" id="scheduled" />
          <div className="flex-1">
            <Label htmlFor="scheduled" className="font-medium cursor-pointer">
              Schedule for Later
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Set a specific date and time to start the lesson. Status will be set to "Scheduled".
            </p>
          </div>
        </div>
      </RadioGroup>

      {isScheduled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-accent/30">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-date">Date</Label>
            <Input
              id="lesson-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => onDateChange(e.target.value)}
              min={today}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-time">Time</Label>
            <Input
              id="lesson-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

