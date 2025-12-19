import { OverviewSection } from "@/entities/dashboard/ui/admin/sections/overview/overview-section";
import { HeroSection } from "@/entities/dashboard/ui/admin/sections/hero/hero-section";
import { Separator } from "@workspace/ui/components/separator";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <HeroSection />

      {/* Tab Menu */}
      <div className="px-96 w-full">
        <Separator className="my-10" />
      </div>

      <OverviewSection />
    </div>
  );
}
