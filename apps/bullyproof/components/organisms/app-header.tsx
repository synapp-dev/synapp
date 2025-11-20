import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";

import { CommandMenu } from "@/components/molecules/command-menu";
import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { ImpersonateMenu } from "@/components/molecules/impersonate-menu";
import { useIsPlatformAdmin } from "@/entities/me/model/store";

export function AppHeader() {

  const isPlatformAdmin = useIsPlatformAdmin();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 sticky top-0 z-50 bg-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-2 px-4">
        {
          isPlatformAdmin && (<>
            <ImpersonateMenu />
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
          </>)
        }
        <CommandMenu />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
        <ThemeToggle />
      </div>
    </header>
  );
}
