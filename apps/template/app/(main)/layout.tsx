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
    <SidebarProvider>
      <MeLoader />
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <SidebarInset>
          <div className="mx-auto w-full max-w-7xl px-6 py-3">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
