"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";
import { Button } from "@workspace/ui/components/button";
import { HelpCircle } from "lucide-react";

import { CommandMenu } from "@/components/molecules/command-menu";
import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { ImpersonateMenu } from "@/components/molecules/impersonate-menu";
import { RoleGuard } from "@/components/molecules/role-guard";
import { useMeStore } from "@/entities/me/model/store";
import {
  getTutorialForPathname,
  type TutorialConfig,
} from "@/config/school-tutorials";
import { SchoolPageTutorialDialog } from "@/components/molecules/school-page-tutorial-dialog";

export function AppHeader() {
  const pathname = usePathname();
  const currentUser = useMeStore((s) => s.currentUser);
  const [tutorialConfig, setTutorialConfig] = useState<TutorialConfig | null>(
    null
  );
  const [showTutorialDialog, setShowTutorialDialog] = useState(false);
  const [isSchoolPage, setIsSchoolPage] = useState(false);

  useEffect(() => {
    const isSchool = pathname.startsWith("/schools/");
    setIsSchoolPage(isSchool);

    // Check for tutorial config for any page (not just school pages)
    const config = getTutorialForPathname(pathname);
    setTutorialConfig(config);
  }, [pathname]);

  const handleHelpClick = () => {
    if (tutorialConfig) {
      setShowTutorialDialog(true);
    }
  };

  // Determine if tutorial is completed (to hide "Don't show again" checkbox)
  const isTutorialCompleted = tutorialConfig
    ? (() => {
        const metadata = (currentUser?.metadata as any) || {};
        const tutorialProgress = metadata.tutorials || {};
        return (
          tutorialProgress[tutorialConfig.tutorialKey]?.completed === true
        );
      })()
    : false;

  return (
    <>
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
          <RoleGuard roles={["PLATFORM_ADMIN"]}>
            <>
              <ImpersonateMenu />
              <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
            </>
          </RoleGuard>
          {tutorialConfig && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleHelpClick}
                className="h-9 w-9 text-muted-foreground"
                title="View tutorial"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
            </>
          )}
          <CommandMenu />
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
          <ThemeToggle />
        </div>
      </header>
      {tutorialConfig && (
        <SchoolPageTutorialDialog
          open={showTutorialDialog}
          onOpenChange={setShowTutorialDialog}
          tutorialKey={tutorialConfig.tutorialKey}
          title={tutorialConfig.title}
          description={tutorialConfig.description}
          showDontShowAgain={!isTutorialCompleted}
        />
      )}
    </>
  );
}
