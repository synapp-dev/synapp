"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StageCards } from "@/entities/curriculum/ui/stage-cards";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import type { curriculumStages } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";

type Stage = typeof curriculumStages.$inferSelect;

export function ContentSection() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await curriculumApi.stages.list({
          limit: 100,
          offset: 0,
        });
        if (result.data) {
          setStages(result.data);
        } else if (result.error) {
          setError(result.error.message ?? "Failed to fetch curriculum stages");
        }
      } catch (err) {
        console.error("Failed to fetch curriculum stages:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch curriculum stages"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStages();
  }, []);

  const handleStageClick = (stage: Stage) => {
    // Navigate to stage detail page using the stage code as slug
    router.push(`/admin/content/${stage.code}`);
  };

  if (isLoading) {
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
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No curriculum stages found</p>
            <p className="text-sm mt-2">
              There are no curriculum stages available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Curriculum Stages</h2>
        <p className="text-muted-foreground">
          Manage and view curriculum stages for the platform.
        </p>
      </div>
      <StageCards stages={stages} onStageClick={handleStageClick} />
    </div>
  );
}
