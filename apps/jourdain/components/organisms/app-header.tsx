"use client";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { CommandMenu } from "@/components/molecules/command-menu";
import { Breadcrumb } from "@/components/molecules/breadcrumb";

export function AppHeader() {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-14 sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 shrink-0 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-2 px-4">
        <CommandMenu />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
        <ThemeToggle />
      </div>
    </header>
  );
}
