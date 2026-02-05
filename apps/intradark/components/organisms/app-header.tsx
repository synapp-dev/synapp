import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";
import { RightSidebarTrigger } from "@workspace/ui/components/right-sidebar-trigger";
import { CommandMenu } from "@/components/molecules/command-menu";
import Image from "next/image";

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 sticky top-0 z-50 bg-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-1">
          <Image
            src="/images/logos/intradark-symbol-blue.svg"
            alt="Intradark Logo"
            width={20}
            height={20}
            className="h-3 w-3 animate-spin-slow mb-2"
          />
          <Image
            src="/images/logos/intradark-wordmark-white.svg"
            alt="Intradark Logo"
            width={100}
            height={20}
            className="h-4"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 px-4">
        <CommandMenu />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
        <ThemeToggle />
        {/* <RightSidebarTrigger /> */}
      </div>
    </header>
  );
}
