"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { LessonWizard } from "@/components/organisms/lesson-wizard";

export default function LessonsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);

  if (!schoolId) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Lessons are a collection of activities that are designed to help
              students learn about bullying and how to prevent it.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsWizardOpen(true)}>Add Lesson</Button>
          </div>
        </CardContent>
      </Card>

      <LessonWizard
        schoolId={schoolId}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
    </>
  );
}
