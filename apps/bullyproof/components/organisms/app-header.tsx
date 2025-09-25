import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";

import { CommandMenu } from "@/components/molecules/command-menu";
import { DemoUserSwitcher } from "@/components/molecules/demo-user-switcher";

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 sticky top-0 z-50 bg-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-lg font-semibold">Bullyproof</h1>
      </div>
      <div className="flex items-center gap-2 px-4">
        <DemoUserSwitcher />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />

        <CommandMenu />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
        <ThemeToggle />
      </div>
    </header>
  );
}
