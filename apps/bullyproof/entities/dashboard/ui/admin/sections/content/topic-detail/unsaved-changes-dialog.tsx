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

// Unsaved Changes Dialog
export function UnsavedChangesDialog({
  showUnsavedChangesDialog,
  setShowUnsavedChangesDialog,
  handleCancelNavigation,
  handleConfirmNavigation,
}: {
  showUnsavedChangesDialog: boolean;
  setShowUnsavedChangesDialog: (open: boolean) => void;
  handleCancelNavigation: () => void;
  handleConfirmNavigation: () => void;
}) {
  return (
    <Dialog
      open={showUnsavedChangesDialog}
      onOpenChange={setShowUnsavedChangesDialog}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes to this topic. Are you sure you want to
            leave this page? Your changes will be lost if you navigate away
            without saving.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelNavigation}>
            Stay on Page
          </Button>
          <Button variant="destructive" onClick={handleConfirmNavigation}>
            Leave Without Saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
