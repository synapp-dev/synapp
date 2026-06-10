"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppRightSidebar } from "@/components/organisms/app-right-sidebar";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { SandboxRightSidebarProvider } from "@/components/organisms/sandbox-right-sidebar-provider";
import { UserProfileLoader } from "@/components/molecules/user-profile-loader";
import { AnthemPlayerProvider } from "@/entities/players/components/anthem-player-provider";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { RightSidebarProvider } from "@workspace/ui/components/right-sidebar-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <RightSidebarProvider>
        <SandboxRightSidebarProvider>
          <UserProfileLoader />
          <AppSidebar />
          <AnthemPlayerProvider>
            <div className="flex flex-col flex-1 max-w-7xl mx-auto">
              <AppHeader />
              <SidebarInset>
                <div className="px-6 py-3">{children}</div>
              </SidebarInset>
            </div>
          </AnthemPlayerProvider>
          <AppRightSidebar />
        </SandboxRightSidebarProvider>
      </RightSidebarProvider>
    </SidebarProvider>
  );
}
