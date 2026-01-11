"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StageCards } from "@/entities/curriculum/ui/stage-cards";
import type { curriculumStages } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Plus } from "lucide-react";
import { AddStageSheet } from "./add-stage-sheet";
import { useStages, useInvalidateStage } from "@/entities/stages/model/store";

type Stage = typeof curriculumStages.$inferSelect & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

export function ContentSection() {
  const router = useRouter();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  // Use the cached React Query hook instead of manual fetching
  const { stages, isLoading, error, refetch } = useStages();
  const { invalidateAllStages } = useInvalidateStage();

  // Trigger background refetch on mount to ensure complete data
  // This ensures that even if we navigated from a topic page that only cached
  // a single stage, we'll fetch all stages in the background while showing cached data
  useEffect(() => {
    // Refetch in the background without blocking the UI
    // The cached data will display immediately, and the UI will update when fresh data arrives
    refetch();
  }, [refetch]);

  const handleStageClick = (stage: Stage) => {
    // Navigate to stage detail page using the stage code as slug
    router.push(`/admin/content/curriculum/${stage.code}`);
  };

  const handleAddNewClick = () => {
    setIsAddSheetOpen(true);
  };

  const handleStageCreated = () => {
    // Invalidate cache and refetch after creating a new stage
    invalidateAllStages();
    refetch();
  };

  if (isLoading && stages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading curriculum stages...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Error loading curriculum stages</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : "Failed to fetch curriculum stages"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Curriculum Stages
            </h2>
            <p className="text-muted-foreground">
              Manage and view curriculum stages for the platform.
            </p>
          </div>
          <Button onClick={handleAddNewClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add new stage
          </Button>
        </div>
        {stages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="font-medium mb-2">No curriculum stages found</p>
            <p className="text-sm">
              There are no curriculum stages available. Click "Add new stage" to
              create one.
            </p>
          </div>
        ) : (
          <StageCards
            stages={stages}
            onStageClick={handleStageClick}
            basePath="/admin/content/curriculum"
          />
        )}
      </div>
      <AddStageSheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        onStageCreated={handleStageCreated}
      />
    </>
  );
}
