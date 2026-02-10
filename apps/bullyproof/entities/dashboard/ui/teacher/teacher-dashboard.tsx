import { TeacherOverviewSection } from "@/entities/dashboard/ui/teacher/sections/overview/overview-section";
import { TeacherHeroSection } from "@/entities/dashboard/ui/teacher/sections/hero/hero-section";
import { Separator } from "@workspace/ui/components/separator";

export function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <TeacherHeroSection />

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
