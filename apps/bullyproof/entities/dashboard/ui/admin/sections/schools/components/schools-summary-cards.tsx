import { SnapshotCard } from "@/entities/dashboard/ui/admin/cards/hero-card";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import schoolsData from "../dummy-data/schools-dummy-data.json";

export function SchoolsSummaryCards() {
  const { summaryMetrics } = schoolsData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Schools Onboarded */}
      <StaggeredAnimation index={0}>
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

      {/* Active vs Pending Schools */}
      {/* <StaggeredAnimation index={1}>
        <SnapshotCard
          title={summaryMetrics.activeVsPending.title}
          icon={summaryMetrics.activeVsPending.icon}
          value={
            summaryMetrics.activeVsPending.value as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          previousValue={
            summaryMetrics.activeVsPending.previousValue as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          subtitle={summaryMetrics.activeVsPending.subtitle}
        />
      </StaggeredAnimation> */}

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

      {/* Schools Missing Data */}
      <StaggeredAnimation index={4}>
        <SnapshotCard
          title={summaryMetrics.schoolsMissingData.title}
          icon={summaryMetrics.schoolsMissingData.icon}
          value={
            summaryMetrics.schoolsMissingData.value as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          previousValue={
            summaryMetrics.schoolsMissingData.previousValue as {
              amount: number;
              type: "number" | "percentage";
            }
          }
          subtitle={summaryMetrics.schoolsMissingData.subtitle}
        />
      </StaggeredAnimation>
    </div>
  );
}
