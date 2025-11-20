"use client";

import { SnapshotCard } from "@/entities/dashboard/ui/admin/cards/hero-card";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import schoolsData from "../dummy-data/schools-dummy-data.json";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";

interface SchoolsSummaryCardsProps {
  onAddSchoolClick: () => void;
}

export function SchoolsSummaryCards({ onAddSchoolClick }: SchoolsSummaryCardsProps) {
  const { summaryMetrics } = schoolsData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Add New School Card */}
      <StaggeredAnimation index={0}>
        <Card className="relative cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={onAddSchoolClick}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New School
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[120px]">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary/60 mb-2">+</div>
              <p className="text-sm text-muted-foreground">Click to add a new school</p>
            </div>
          </CardContent>
        </Card>
      </StaggeredAnimation>

      {/* Total Schools Onboarded */}
      <StaggeredAnimation index={1}>
        <SnapshotCard
          title={summaryMetrics.totalSchools.title}
          icon={summaryMetrics.totalSchools.icon}
          value={
            summaryMetrics.totalSchools.value as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          previousValue={
            summaryMetrics.totalSchools.previousValue as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          subtitle={summaryMetrics.totalSchools.subtitle}
        />
      </StaggeredAnimation>

      {/* Average School Engagement */}
      <StaggeredAnimation index={2}>
        <SnapshotCard
          title={summaryMetrics.averageEngagement.title}
          icon={summaryMetrics.averageEngagement.icon}
          value={
            summaryMetrics.averageEngagement.value as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          previousValue={
            summaryMetrics.averageEngagement.previousValue as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          subtitle={summaryMetrics.averageEngagement.subtitle}
        />
      </StaggeredAnimation>

      {/* Average Culture Rating */}
      <StaggeredAnimation index={3}>
        <SnapshotCard
          title={summaryMetrics.averageCultureRating.title}
          icon={summaryMetrics.averageCultureRating.icon}
          value={
            summaryMetrics.averageCultureRating.value as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          previousValue={
            summaryMetrics.averageCultureRating.previousValue as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          subtitle={summaryMetrics.averageCultureRating.subtitle}
        />
      </StaggeredAnimation>
    </div>
  );
}
