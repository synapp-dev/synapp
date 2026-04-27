import { TeacherOverviewSection } from "@/entities/dashboard/ui/teacher/sections/overview/overview-section";
import { TeacherHeroSection } from "@/entities/dashboard/ui/teacher/sections/hero/hero-section";
import { CultureRatingDashboardTeaser } from "@/entities/culture-rating/ui/culture-rating-dashboard-teaser";
import { Separator } from "@workspace/ui/components/separator";

export function StaffDashboard() {
  return (
    <div className="space-y-6">
      <TeacherHeroSection />

      <CultureRatingDashboardTeaser />

      {/* Tab Menu */}
      <div className="px-96 w-full">
        <Separator className="my-10" />
      </div>

      <div>
        <TeacherOverviewSection />
      </div>
    </div>
  );
}
