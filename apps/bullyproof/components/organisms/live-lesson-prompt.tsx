"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { toast } from "sonner";
import { TvMinimalPlay } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

const STORAGE_KEY_PREFIX = "live-lesson-prompt-interacted-";

function getStorageKey(liveUrl: string): string {
  return `${STORAGE_KEY_PREFIX}${liveUrl}`;
}

function hasInteractedWithPrompt(liveUrl: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = getStorageKey(liveUrl);
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function markPromptAsInteracted(liveUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(liveUrl);
    sessionStorage.setItem(key, "true");
  } catch {
    // Ignore storage errors
  }
}

export function LiveLessonPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const isLive = useLiveLessonStore((s) => s.isLive);
  const liveUrl = useLiveLessonStore((s) => s.getUrl());
  const title = useLiveLessonStore((s) => s.title);

  const hasPromptedRef = React.useRef(false);
  const toastIdRef = React.useRef<string | number | null>(null);

  React.useEffect(() => {
    if (!isLive || !liveUrl) {
      // Dismiss toast if lesson is no longer live
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      hasPromptedRef.current = false;
      return;
    }

    const onLiveLessonPath =
      pathname === liveUrl || pathname.startsWith(liveUrl + "/");
    if (onLiveLessonPath) {
      // Dismiss toast if user is already on the live lesson page
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      hasPromptedRef.current = false;
      return;
    }

    // Check if user has already interacted with this prompt in this session
    if (hasInteractedWithPrompt(liveUrl)) {
      return;
    }

    // Only show toast once per session (unless already interacted)
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;

    // Show custom toast notification with card layout
    const id = toast.custom(
      (t) => {
        const handleGoToLesson = () => {
          if (liveUrl) {
            // Mark as interacted before navigation
            markPromptAsInteracted(liveUrl);
            router.push(liveUrl);
            toast.dismiss(t);
            toastIdRef.current = null;
            hasPromptedRef.current = false;
          }
        };

        const handleCancel = () => {
          // Mark as interacted when dismissed
          markPromptAsInteracted(liveUrl);
          toast.dismiss(t);
          toastIdRef.current = null;
        };

        return (
          <div className="w-full max-w-sm rounded-lg border border-orange-200 bg-background p-4 shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <TvMinimalPlay className="h-4 w-4 text-orange-600" />
              <h3 className="font-medium text-sm">Live lesson in progress</h3>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-4">
              You currently have a live lesson in progress.
            </p>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleGoToLesson}
                className="h-8 bg-orange-600 hover:bg-orange-700"
              >
                View lesson
              </Button>
            </div>
          </div>
        );
      },
      {
        id: "live-lesson-prompt",
        duration: Infinity, // Don't auto-dismiss
      }
    );

    toastIdRef.current = id;
  }, [isLive, liveUrl, pathname, router, title]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return null;
}
