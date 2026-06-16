"use client";

import { Suspense } from "react";
import { AppHeader } from "@/components/organisms/app-header";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { MeLoader } from "@/components/molecules/me-loader";
import { ReminderResponder } from "@/components/organisms/reminder-responder";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The document is the scroll container — the fixed sidebar stays put and the
  // header sticks to the top while the page scrolls as a whole, rather than
  // scrolling an inner pane within a viewport-locked shell.
  return (
    <SidebarProvider className="flex min-h-svh w-full">
      <MeLoader />
      <Suspense fallback={null}>
        <ReminderResponder />
      </Suspense>
      <AppSidebar />
      <div className="mx-auto flex min-w-0 flex-1 max-w-7xl flex-col">
        <AppHeader />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip px-6 pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
