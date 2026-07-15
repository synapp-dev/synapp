"use client";

import CountUp from "react-countup";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Progress } from "@workspace/ui/components/progress";

// Save Progress Dialog
export function SaveProgressDialog({
  showSaveProgressDialog,
  setShowSaveProgressDialog,
  isSaving,
  saveStatus,
  saveProgress,
}: {
  showSaveProgressDialog: boolean;
  setShowSaveProgressDialog: (open: boolean) => void;
  isSaving: boolean;
  saveStatus: string;
  saveProgress: number;
}) {
  return (
    <Dialog
      open={showSaveProgressDialog}
      onOpenChange={(open) => {
        // Prevent closing dialog while saving
        if (!isSaving) {
          setShowSaveProgressDialog(open);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Saving Changes
          </DialogTitle>
          <DialogDescription>
            {saveStatus ||
              "Please wait while your changes are being saved..."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {saveStatus || "Saving..."}
              </span>
              <span className="text-muted-foreground">
                <CountUp
                  end={saveProgress}
                  duration={2}
                  decimals={0}
                  preserveValue={true}
                />
                %
              </span>
            </div>
            <Progress
              value={saveProgress}
              className="h-2"
              indicatorStyle={{
                transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
