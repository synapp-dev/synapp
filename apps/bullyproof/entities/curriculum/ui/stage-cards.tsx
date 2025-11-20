"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { BookOpen } from "lucide-react";
import type { curriculumStages } from "@/server/db/schema";

type Stage = typeof curriculumStages.$inferSelect;

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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Code</span>
                  <span className="text-sm font-mono font-semibold">{stage.code}</span>
                </div>
                {stage.sortIndex !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Order</span>
                    <span className="text-sm font-semibold">{stage.sortIndex}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}

