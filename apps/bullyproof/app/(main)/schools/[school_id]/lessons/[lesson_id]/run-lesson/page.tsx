"use client";

import { useState, use, useEffect } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Presentation, Settings } from "lucide-react";
// import { Settings } from "lucide-react"; // Commented out for now - control mode disabled
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSearchParams, useRouter } from "next/navigation";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useMeStore } from "@/entities/me/model/store";
import { Loader2 } from "lucide-react";

export default function LessonRunLessonPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  usePageTitle(["schools", "lessons", "run-lesson"]);
  const { school_id, lesson_id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [presentDialogOpen, setPresentDialogOpen] = useState(false);
  // const [controlsDialogOpen, setControlsDialogOpen] = useState(false); // Commented out - control mode disabled

  // Check if user is the lesson creator
  const { data: lessonData, isLoading: isLoadingLesson } = useLessonById(lesson_id);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;

  // Redirect if user is not the creator
  useEffect(() => {
    if (!isLoadingLesson && lessonData && currentUser) {
      if (!isLessonCreator) {
        router.replace(`/schools/${school_id}/lessons/${lesson_id}`);
      }
    }
  }, [isLoadingLesson, lessonData, currentUser, isLessonCreator, router, school_id, lesson_id]);

  // Check for query param to auto-open dialog
  useEffect(() => {
    const dialog = searchParams?.get("dialog");
    if (dialog === "present" && isLessonCreator) {
      setPresentDialogOpen(true);
    }
  }, [searchParams, isLessonCreator]);

  // Show loading state while checking permissions
  if (isLoadingLesson || !currentUser || !lessonData) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading lesson details...</p>
          </div>
        </div>
      </>
    );
  }

  // Show unauthorized message if not creator (will redirect, but show message briefly)
  if (!isLessonCreator) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive font-medium">
              Only the teacher can run this lesson
            </p>
            <p className="text-muted-foreground mt-2">
              Redirecting...
            </p>
          </div>
        </div>
      </>
    );
  }

  const handlePresentAccept = () => {
    const presentUrl = `/schools/${school_id}/lessons/${lesson_id}/run-lesson/present`;
    window.open(presentUrl, "_blank", "noopener,noreferrer");
    setPresentDialogOpen(false);
  };

  // Commented out - control mode disabled
  // const handleControlsAccept = () => {
  //   const controlsUrl = `/schools/${school_id}/lessons/${lesson_id}/run-lesson/controls`;
  //   window.open(controlsUrl, "_blank", "noopener,noreferrer");
  //   setControlsDialogOpen(false);
  // };

  return (
    <>
      <PlatformAdminGuard />
      <div className="space-y-6">
      {/* <div>
        <h1 className="text-3xl font-bold mb-2">Run Lesson</h1>
        <p className="text-muted-foreground">
          Choose a mode to run your lesson
        </p>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Presentation Mode Card */}
        <Card
          className="h-full hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setPresentDialogOpen(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Presentation Mode</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">
              Display slides in fullscreen mode for your classroom. This view
              shows only the slides with minimal controls, perfect for
              projecting to students. Navigate with arrow keys and hover near
              the bottom to reveal controls.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Control Mode Card - Disabled for now */}
        <Card
          className="h-full opacity-50 cursor-not-allowed"
          // onClick={() => setControlsDialogOpen(true)} // Commented out - control mode disabled
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-muted-foreground">
                Control Mode
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">
              View slides with teacher notes simultaneously. This mode shows
              slides at the top and your notes at the bottom, giving you full
              control while presenting. Perfect for managing your lesson flow
              and staying on track with your talking points.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Presentation Mode Dialog */}
      <Dialog open={presentDialogOpen} onOpenChange={setPresentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Presentation Mode</DialogTitle>
            <DialogDescription>
              A new tab will open with the presentation view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              This tab will be what the class will see. You should move this tab
              to open on a projector screen.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  You may duplicate your screen:
                </strong>{" "}
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select "Duplicate"
              </p>
              <p>
                <strong className="text-foreground">
                  However, it is recommended you extend your screen:
                </strong>{" "}
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select "Extend". This allows you to see the controls
                on your main screen while the class sees the presentation on the
                extended display.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPresentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePresentAccept}>Open Presentation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Controls Mode Dialog - Commented out - control mode disabled */}
      {/* <Dialog open={controlsDialogOpen} onOpenChange={setControlsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Control Mode</DialogTitle>
            <DialogDescription>
              A new tab will open with the control view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              This view is for you and should not be shown to the class.
            </p>
            <p className="text-sm text-muted-foreground">
              You can view the controls on your laptop, tablet, or phone by
              signing in and selecting "Controls" from the lesson run page.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setControlsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleControlsAccept}>Open Controls</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
    </>
  );
}
