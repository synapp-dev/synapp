"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronsRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { useCompleteTutorial } from "@/entities/me/api/completeTutorial";

type SchoolPageTutorialDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorialKey: string;
  title: string;
  description: string;
  showDontShowAgain: boolean;
};

export function SchoolPageTutorialDialog({
  open,
  onOpenChange,
  tutorialKey,
  title,
  description,
  showDontShowAgain,
}: SchoolPageTutorialDialogProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const completeTutorial = useCompleteTutorial();

  const handleGotIt = async () => {
    if (showDontShowAgain && dontShowAgain) {
      try {
        await completeTutorial.mutateAsync(tutorialKey);
      } catch (error) {
        console.error("Error completing tutorial:", error);
        // Still proceed even if there's an error
      }
    }
    onOpenChange(false);
    setDontShowAgain(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[65vh] flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="text-center shrink-0">
          <div className="flex flex-col items-center gap-4 pb-2">
            <Image
              src="/images/bullyproof-logo.svg"
              alt="BullyProof"
              width={120}
              height={32}
              className="h-auto"
            />
          </div>
          <DialogTitle className="text-center text-2xl mt-6">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-4">
            <DialogDescription className="flex-1 text-left m-0">
              {description}
            </DialogDescription>
            <div className="relative w-24 h-24 flex-shrink-0">
              <Image
                src="/images/bp-man/bp-man-pointleft.svg"
                alt="BP-Man pointing left"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </DialogHeader>

        {showDontShowAgain && (
          <div className="flex justify-center pt-4 pb-4">
            <Card
              className={cn(
                "px-4 py-1 transition-all cursor-pointer w-fit group rounded-lg",
                dontShowAgain
                  ? "bg-blue-100/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800"
                  : cn(
                      "bg-card border-border",
                      "hover:border-blue-300 dark:hover:border-blue-800",
                      "hover:[animation:var(--animate-border-pulse-blue)]"
                    )
              )}
              onClick={() => setDontShowAgain(!dontShowAgain)}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) =>
                    setDontShowAgain(checked === true)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "transition-colors",
                    dontShowAgain &&
                      "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  )}
                />
                <Label
                  htmlFor="dont-show-again"
                  className={cn(
                    "text-sm font-normal cursor-pointer transition-colors",
                    dontShowAgain
                      ? "text-blue-900 dark:text-blue-200"
                      : "group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  Don&apos;t show this again
                </Label>
              </div>
            </Card>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <div className="flex w-full items-center justify-center">
            <Button
              type="button"
              onClick={handleGotIt}
              disabled={completeTutorial.isPending}
              className="bg-[var(--brand-bullyproof-primary)] gap-1 text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
            >
              {completeTutorial.isPending ? (
                "Loading..."
              ) : (
                <>
                  Got it
                  <ChevronsRight className="h-4 w-4 [animation:var(--animate-bounce-right)]" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
