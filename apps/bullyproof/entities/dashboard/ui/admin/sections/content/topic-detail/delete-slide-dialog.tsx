"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

// Delete Slide Confirmation Dialog
export function DeleteSlideDialog({
  showDeleteDialog,
  setShowDeleteDialog,
  isDeletingSlide,
  handleDeleteSlide,
  setBulkDeleteSelectedIds,
  setShowBulkDeleteDialog,
}: {
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  isDeletingSlide: boolean;
  handleDeleteSlide: () => void;
  setBulkDeleteSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowBulkDeleteDialog: (open: boolean) => void;
}) {
  return (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Slide</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this slide? This action cannot be
            undone. All remaining slides will be reordered accordingly.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={isDeletingSlide}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSlide}
            disabled={isDeletingSlide}
          >
            {isDeletingSlide ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteDialog(false);
              setBulkDeleteSelectedIds(new Set());
              setShowBulkDeleteDialog(true);
            }}
            disabled={isDeletingSlide}
          >
            Bulk Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
