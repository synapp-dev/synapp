"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { BookOpen } from "lucide-react";
import type { curriculumStages } from "@/server/db/schema";

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

interface StageCardsProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
}

export function StageCards({ stages, onStageClick }: StageCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stages.map((stage, index) => (
        <StaggeredAnimation key={stage.id} index={index}>
          <Card
            className={`relative transition-shadow ${
              onStageClick ? "cursor-pointer hover:shadow-md" : ""
            }`}
            onClick={() => onStageClick?.(stage)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>{stage.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stage.years && stage.years.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {stage.years.map((year) => (
                      <Badge key={year.id} variant="outline">
                        {year.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No year levels assigned
                </div>
              )}
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}
