"use client";

import { MeLoader } from "@/components/molecules/me-loader";
import { TutorialGuard } from "@/components/molecules/tutorial-guard";
import { TeacherClassesGuard } from "@/components/molecules/teacher-classes-guard";
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
      <TutorialGuard />
      <TeacherClassesGuard />
      <AppSidebar />
      <div className="flex flex-col flex-1 max-w-7xl mx-auto">
        <AppHeader />
        <SidebarInset className="h-full">
          <div className="px-6 py-3">{children}</div>
        </SidebarInset>
      </div>
    </ResponsiveSidebarProvider>
  );
}
