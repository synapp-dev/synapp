"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { certificationStages } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Plus } from "lucide-react";
import { AddCertificationStageSheet } from "./add-certification-stage-sheet";
import {
  useCertificationStages,
  useInvalidateCertificationStage,
} from "@/entities/certification/model/store";
import { StageCards } from "@/entities/curriculum/ui/stage-cards";

type Stage = typeof certificationStages.$inferSelect & {
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
  const { stages, isLoading, error, refetch } = useCertificationStages();
  const { invalidateAllStages } = useInvalidateCertificationStage();

  // Trigger background refetch on mount to ensure complete data
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleStageClick = (stage: Stage) => {
    router.push(`${basePath}/${stage.code}`);
  };

  const handleAddNewClick = () => {
    setIsAddSheetOpen(true);
  };

  const handleStageCreated = () => {
    invalidateAllStages();
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

  if (isLoading && stages.length === 0) {
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
        {stages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="font-medium mb-2">{emptyText}</p>
            <p className="text-sm">{emptyDescription}</p>
          </div>
        ) : (
          <StageCards
            stages={stages}
            onStageClick={handleStageClick}
            basePath={basePath}
            type="certification"
          />
        )}
      </div>
      {isAdmin && (
        <AddCertificationStageSheet
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          onStageCreated={handleStageCreated}
        />
      )}
    </>
  );
}
