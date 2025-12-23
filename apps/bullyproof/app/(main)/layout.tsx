"use client";

import { MeLoader } from "@/components/molecules/me-loader";
import { TutorialGuard } from "@/components/molecules/tutorial-guard";
import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <MeLoader />
      <TutorialGuard />
      <AppSidebar />
      <div className="flex flex-col flex-1 max-w-7xl mx-auto">
        <AppHeader />
        <SidebarInset className="h-full">
          <div className="px-6 py-3">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
