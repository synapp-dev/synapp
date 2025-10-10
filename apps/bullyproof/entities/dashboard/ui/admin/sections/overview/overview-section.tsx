import { SnapshotCard } from "@/entities/dashboard/ui/admin/cards/hero-card";
import { CultureRatingCard } from "@/entities/dashboard/ui/admin/cards/culture-rating-card";
import { LessonsChartCard } from "@/entities/dashboard/ui/admin/cards/lessons-chart-card";
import dummyData from "@/entities/dashboard/ui/admin/dummy-data/snapshot-card-dummy-data.json";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

export function OverviewSection() {
  const { metrics, cultureRating, lessonsChart } = dummyData;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Schools Card */}
        <StaggeredAnimation index={0}>
          <SnapshotCard
            title={metrics.totalSchools.title}
            icon={metrics.totalSchools.icon}
            value={
              metrics.totalSchools.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.totalSchools.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.totalSchools.subtitle}
          />
        </StaggeredAnimation>

        {/* Active Teachers Card */}
        <StaggeredAnimation index={1}>
          <SnapshotCard
            title={metrics.activeTeachers.title}
            icon={metrics.activeTeachers.icon}
            value={
              metrics.activeTeachers.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.activeTeachers.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.activeTeachers.subtitle}
          />
        </StaggeredAnimation>
        {/* Engagement Rate Card */}
        <StaggeredAnimation index={2}>
          <SnapshotCard
            title={metrics.engagementRate.title}
            icon={metrics.engagementRate.icon}
            value={
              metrics.engagementRate.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.engagementRate.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.engagementRate.subtitle}
          />
        </StaggeredAnimation>
        {/* Completed Lessons Card */}
        <StaggeredAnimation index={3}>
          <SnapshotCard
            title={metrics.completedLessons.title}
            icon={metrics.completedLessons.icon}
            value={
              metrics.completedLessons.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.completedLessons.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.completedLessons.subtitle}
          />
        </StaggeredAnimation>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Culture Rating Chart Card */}
        <CultureRatingCard
          title={cultureRating.title}
          schools={
            cultureRating.schools as Array<{
              id: string;
              name: string;
              data: Array<{
                metric: string;
                value: { amount: number; type: "number" | "percentage" };
                previousValue: {
                  amount: number;
                  type: "number" | "percentage";
                };
                label: string;
              }>;
            }>
          }
        />

        {/* Lessons Delivered Chart Card */}
        <LessonsChartCard
          title={lessonsChart.title}
          data={lessonsChart.data}
          trend={{
            ...lessonsChart.trend,
            direction: lessonsChart.trend.direction as "up" | "down",
          }}
        />
      </div>
    </div>
  );
}
