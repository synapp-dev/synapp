"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { UserProfileLoader } from "@/components/molecules/user-profile-loader";

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
      <UserProfileLoader />
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
