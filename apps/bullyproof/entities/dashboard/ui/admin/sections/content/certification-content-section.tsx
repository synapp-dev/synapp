"use client";

import type { CertificationCourseRow } from "@/types/db";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Plus } from "lucide-react";
import { AddCertificationCourseSheet } from "./add-certification-course-sheet";
import {
  useCertificationCourses,
  useInvalidateCertificationCourse,
} from "@/entities/certification/model/store";
import { StageCards } from "@/entities/curriculum/ui/stage-cards";

type Course = CertificationCourseRow & {
  topicCount?: number;
};

interface CertificationContentSectionProps {
  /** Whether this is admin mode (shows add button) */
  isAdmin?: boolean;
  /** The title to display */
  title: string;
  /** The description to display */
  description: string;
  /** Base path for navigation */
  basePath: string;
}

export function CertificationContentSection({
  isAdmin = false,
  title,
  description,
  basePath,
}: CertificationContentSectionProps) {
  const router = useRouter();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const { courses, isLoading, error, refetch } = useCertificationCourses();
  const { invalidateAllCourses } = useInvalidateCertificationCourse();

  // Trigger background refetch on mount to ensure complete data
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleStageClick = (course: Course) => {
    router.push(`${basePath}/${course.code}`);
  };

  const handleAddNewClick = () => {
    setIsAddSheetOpen(true);
  };

  const handleCourseCreated = () => {
    invalidateAllCourses();
    refetch();
  };

  const loadingText = isAdmin
    ? "Loading certification stages..."
    : "Loading certification courses...";
  const errorText = isAdmin
    ? "Error loading certification stages"
    : "Error loading certification courses";
  const emptyText = isAdmin
    ? "No certification stages found"
    : "No certification courses found";
  const emptyDescription = isAdmin
    ? 'There are no certification stages available. Click "Add new stage" to create one.'
    : "There are no certification courses available at this time.";

  if (isLoading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">{errorText}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : `Failed to fetch ${isAdmin ? "certification stages" : "certification courses"}`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className={isAdmin ? "flex items-center justify-between" : ""}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddNewClick} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add new stage
            </Button>
          )}
        </div>
        {courses.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="font-medium mb-2">{emptyText}</p>
            <p className="text-sm">{emptyDescription}</p>
          </div>
        ) : (
          <StageCards
            stages={courses}
            onStageClick={handleStageClick}
            basePath={basePath}
            type="certification"
          />
        )}
      </div>
      {isAdmin && (
        <AddCertificationCourseSheet
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          onCourseCreated={handleCourseCreated}
        />
      )}
    </>
  );
}
