"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

// Validation Dialog - Missing Image/Video
export function ValidationDialog({
  showValidationDialog,
  setShowValidationDialog,
}: {
  showValidationDialog: boolean;
  setShowValidationDialog: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={showValidationDialog}
      onOpenChange={setShowValidationDialog}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Missing Image</DialogTitle>
          <DialogDescription>
            You have a slide that does not have an image. Please provide an
            image before saving changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setShowValidationDialog(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
