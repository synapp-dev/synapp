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
    <SidebarProvider className="min-h-svh w-full">
      <MeLoader />
      <AppSidebar />
      <div className="mx-auto flex min-w-0 flex-1 max-w-7xl flex-col">
        <AppHeader />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0 px-6 py-3">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
