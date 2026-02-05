"use client";

import { MeLoader } from "@/components/molecules/me-loader";
import { PermissionsReadyGate } from "@/components/molecules/permissions-ready-gate";
import { MaintenanceRedirectGuard } from "@/components/molecules/maintenance-redirect-guard";
import { TutorialGuard } from "@/components/molecules/tutorial-guard";
import { DashboardTutorialGuard } from "@/components/molecules/dashboard-tutorial-guard";
import { TeacherClassesGuard } from "@/components/molecules/teacher-classes-guard";
import { CourseRatingDashboardGuard } from "@/components/organisms/course-rating-dashboard-guard";
import { OverdueLessonAlert } from "@/components/organisms/overdue-lesson-alert";
import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { ResponsiveSidebarProvider } from "@/components/organisms/responsive-sidebar-provider";

import { SidebarInset } from "@workspace/ui/components/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ResponsiveSidebarProvider>
      <MeLoader />
      <PermissionsReadyGate>
        <MaintenanceRedirectGuard />
        <TutorialGuard />
        <DashboardTutorialGuard />
        <TeacherClassesGuard />
        <CourseRatingDashboardGuard />
        <OverdueLessonAlert />
        <AppSidebar />
        <div className="flex flex-col flex-1 max-w-7xl mx-auto">
          <AppHeader />
          <SidebarInset className="h-full">
            <div className="px-6 py-3">{children}</div>
          </SidebarInset>
        </div>
      </PermissionsReadyGate>
    </ResponsiveSidebarProvider>
  );
}
