"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { MeLoader } from "@/components/molecules/me-loader";

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
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <MeLoader />
      <AppSidebar />
      <div className="mx-auto flex min-h-0 min-w-0 flex-1 max-w-7xl flex-col overflow-hidden">
        <AppHeader />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-3">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
