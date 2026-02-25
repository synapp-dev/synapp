"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import {
  getTutorialForPathname,
  type TutorialConfig,
} from "@/config/school-tutorials";
import { SchoolPageTutorialDialog } from "./school-page-tutorial-dialog";
import { useEffectiveUser } from "@/hooks/use-effective-user";

/**
 * SchoolPageTutorialGuard component
 *
 * Client-side guard that checks if a tutorial should be shown for the current school page.
 * Shows the tutorial dialog on first visit to tutorial-enabled routes.
 */
export function SchoolPageTutorialGuard() {
  const pathname = usePathname();
  const currentUser = useEffectiveUser();
  const { isLoading } = useCurrentUser();
  const [tutorialConfig, setTutorialConfig] = useState<TutorialConfig | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Don't check while loading or if user is not loaded
    if (isLoading || !currentUser) {
      return;
    }

    // Get tutorial config for current pathname
    const config = getTutorialForPathname(pathname);
    if (!config) {
      setTutorialConfig(null);
      setShowDialog(false);
      return;
    }

    // Check if tutorial is already completed
    const metadata = (currentUser.metadata as any) || {};
    const tutorialProgress = metadata.tutorials || {};
    const isCompleted =
      tutorialProgress[config.tutorialKey]?.completed === true;

    // Only show dialog if tutorial is not completed
    if (!isCompleted) {
      setTutorialConfig(config);
      setShowDialog(true);
    } else {
      setTutorialConfig(null);
      setShowDialog(false);
    }
  }, [pathname, currentUser, isLoading]);

  if (!tutorialConfig || !showDialog) {
    return null;
  }

  return (
    <SchoolPageTutorialDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      tutorialKey={tutorialConfig.tutorialKey}
      title={tutorialConfig.title}
      description={tutorialConfig.description}
      showDontShowAgain={true}
    />
  );
}
