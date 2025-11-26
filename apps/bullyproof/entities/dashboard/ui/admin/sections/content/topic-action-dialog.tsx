"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Eye, Edit } from "lucide-react";

interface TopicActionDialogProps {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: () => void;
  onEdit: () => void;
}

export function TopicActionDialog({
  topicId,
  open,
  onOpenChange,
  onPreview,
  onEdit,
}: TopicActionDialogProps) {
  const handlePreview = () => {
    onOpenChange(false);
    onPreview();
  };

  const handleEdit = () => {
    onOpenChange(false);
    onEdit();
  };

  return (
    <Dialog open={open && topicId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose an action</DialogTitle>
          <DialogDescription>
            What would you like to do with this topic?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleEdit} className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
