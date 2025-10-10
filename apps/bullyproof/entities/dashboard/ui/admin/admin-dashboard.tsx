import { OverviewSection } from "@/entities/dashboard/ui/admin/sections/overview/overview-section";
import { PlatformSection } from "@/entities/dashboard/ui/admin/sections/platform/platform-section";
import { HeroSection } from "@/entities/dashboard/ui/admin/sections/hero/hero-section";
import { SchoolsSection } from "@/entities/dashboard/ui/admin/sections/schools/schools-section";
import { AnalyticsSection } from "@/entities/dashboard/ui/admin/sections/analytics/analytics-section";
import { CoursesSection } from "@/entities/dashboard/ui/admin/sections/courses/courses-section";
import { CultureSection } from "@/entities/dashboard/ui/admin/sections/culture/culture-section";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import { Separator } from "@workspace/ui/components/separator";
import {
  AppWindow,
  BookText,
  ChartNoAxesCombined,
  Home,
  PieChart,
  School,
} from "lucide-react";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <HeroSection />

      {/* Tab Menu */}
      <Separator className="mt-12 mb-6" />

      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Home className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schools">
            <School className="size-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="platform">
            {/* <Platform className="size-4" /> */}
            <AppWindow className="size-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <ChartNoAxesCombined className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="courses">
            {/* <Courses className="size-4" /> */}
            <BookText className="size-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="culture">
            <PieChart className="size-4" />
            Culture
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewSection />
        </TabsContent>
        <TabsContent value="schools">
          <SchoolsSection />
        </TabsContent>
        <TabsContent value="platform">
          <PlatformSection />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsSection />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesSection />
        </TabsContent>
        <TabsContent value="culture">
          <CultureSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
