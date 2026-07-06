"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { toBlob } from "html-to-image";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";
import { Button } from "@workspace/ui/components/button";
import { HelpCircle, Bug } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { ImpersonateMenu } from "@/components/molecules/impersonate-menu";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { FeedbackDialog } from "@/components/organisms/feedback-dialog";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useMeStore } from "@/entities/me/model/store";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import {
  getTutorialForPathname,
  type TutorialConfig,
} from "@/config/school-tutorials";
import { SchoolPageTutorialDialog } from "@/components/molecules/school-page-tutorial-dialog";

export function AppHeader() {
  const pathname = usePathname();
  const currentUser = useEffectiveUser();
  const viewAsUser = useMeStore((s) => s.viewAsUser);
  const [tutorialConfig, setTutorialConfig] = useState<TutorialConfig | null>(
    null
  );
  const [showTutorialDialog, setShowTutorialDialog] = useState(false);
  const [isSchoolPage, setIsSchoolPage] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);
  const unreadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { visible: isFeedbackButtonVisible, isLoading: isFeedbackFeatureLoading } =
    useFeatureAccess("system:feedback-button");
  const shouldFetchUnread = isFeedbackButtonVisible && !isFeedbackFeatureLoading;

  // Fetch unread ticket note count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { createBrowserClient } = await import("@/utils/supabase/client");
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/feedback-tickets/unread-count", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadTicketCount(data.count ?? 0);
      }
    } catch {
      // Silently ignore — badge is non-critical
    }
  }, []);

  const fetchUnreadCountRef = useRef(fetchUnreadCount);
  const shouldFetchUnreadRef = useRef(shouldFetchUnread);
  fetchUnreadCountRef.current = fetchUnreadCount;
  shouldFetchUnreadRef.current = shouldFetchUnread;

  // Poll for unread count on mount and every 60 seconds (only when feedback button is visible)
  useEffect(() => {
    if (!shouldFetchUnread) {
      if (unreadPollRef.current) {
        clearInterval(unreadPollRef.current);
        unreadPollRef.current = null;
      }
      return;
    }
    fetchUnreadCountRef.current();
    unreadPollRef.current = setInterval(
      () => fetchUnreadCountRef.current(),
      60_000
    );
    return () => {
      if (unreadPollRef.current) clearInterval(unreadPollRef.current);
    };
  }, [shouldFetchUnread]);

  // Re-fetch when dialog closes (user may have read notes)
  useEffect(() => {
    if (!showFeedbackDialog && shouldFetchUnreadRef.current) {
      fetchUnreadCountRef.current();
    }
  }, [showFeedbackDialog]);

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

  const handleFeedbackClick = useCallback(async () => {
    setIsCapturingScreenshot(true);
    try {
      const blob = await toBlob(document.body, {
        pixelRatio: window.devicePixelRatio > 1 ? 1.5 : 1,
        filter: (element) => {
          // Skip iframes which can cause capture failures
          if (element instanceof HTMLIFrameElement) return false;
          return true;
        },
      });

      setScreenshotBlob(blob);
      setShowFeedbackDialog(true);
    } catch (err) {
      console.error("[FeedbackDialog] Screenshot capture failed:", err);
      // If screenshot fails, still open the dialog without a screenshot
      setScreenshotBlob(null);
      setShowFeedbackDialog(true);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, []);

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
          {viewAsUser ? (
            <>
              <ImpersonateMenu />
              <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
            </>
          ) : (
            <FeatureGuard feature="system:impersonate">
              <ImpersonateMenu />
              <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
            </FeatureGuard>
          )}
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
          <FeatureGuard feature="system:feedback-button">
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFeedbackClick}
                  disabled={isCapturingScreenshot}
                  className={`h-9 w-9 relative transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive ${isCapturingScreenshot ? "animate-pulse border border-destructive bg-destructive/10 text-destructive" : "text-muted-foreground"}`}
                >
                  <Bug
                    className={`h-4 w-4 ${isCapturingScreenshot ? "animate-shake-twice" : ""}`}
                  />
                  {unreadTicketCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white pointer-events-none">
                      {unreadTicketCount > 9 ? "9+" : unreadTicketCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>
                  Send Feedback
                  {unreadTicketCount > 0 && (
                    <span className="ml-1 text-blue-400">
                      ({unreadTicketCount} unread)
                    </span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </FeatureGuard>
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
      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        screenshotBlob={screenshotBlob}
        onUnreadCountChange={fetchUnreadCount}
      />
    </>
  );
}
