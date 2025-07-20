"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { UserProfileLoader } from "@/components/molecules/user-profile-loader";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { RightSidebarProvider } from "@workspace/ui/providers/right-sidebar-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <RightSidebarProvider>
        <UserProfileLoader />
        <AppSidebar />
        <div className="flex flex-col flex-1 max-w-7xl mx-auto">
          <AppHeader />
          <SidebarInset>
            <div className="px-6 py-3">{children}</div>
          </SidebarInset>
        </div>
      </RightSidebarProvider>
    </SidebarProvider>
  );
}
