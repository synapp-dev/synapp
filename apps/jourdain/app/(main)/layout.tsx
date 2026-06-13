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
    <SidebarProvider className="flex h-svh max-h-svh min-h-0 w-full overflow-hidden">
      <MeLoader />
      <AppSidebar />
      <div className="mx-auto flex min-h-0 min-w-0 flex-1 max-w-7xl flex-col overflow-hidden">
        <AppHeader />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
