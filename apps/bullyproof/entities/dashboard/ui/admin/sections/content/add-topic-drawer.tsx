"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Loader2 } from "lucide-react";
import { topicsApi } from "@/entities/topics/api/endpoints";

interface AddTopicDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  onTopicAdded: (topic: {
    id: string;
    title: string;
    officialNotes: string | null;
    stageId: string;
    stageOrder: number | null;
    status: string;
    createdAt: string;
    slides?: any[];
  }) => void;
}

export function AddTopicDrawer({
  open,
  onOpenChange,
  stageId,
  onTopicAdded,
}: AddTopicDrawerProps) {
  const [title, setTitle] = useState("");
  const [officialNotes, setOfficialNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await topicsApi.post.create({
        stageId,
        title: title.trim(),
        officialNotes: officialNotes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create topic");
        return;
      }

      if (result.data) {
        // Create a topic object for callback
        const newTopic = {
          id: result.data.id,
          title: result.data.title,
          officialNotes: result.data.officialNotes || null,
          stageId,
          stageOrder: result.data.stageOrder || null,
          status: result.data.status || "draft",
          createdAt: result.data.createdAt || new Date().toISOString(),
          slides: [],
        };

        onTopicAdded(newTopic);
        
        // Reset form
        setTitle("");
        setOfficialNotes("");
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("");
      setOfficialNotes("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="top" className="max-w-2xl mx-auto rounded-b-lg shadow-lg border-t border-x border-b">
        <div className="p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Add New Topic</SheetTitle>
            <SheetDescription>
              Create a new topic for this stage. You can add slides after saving.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter topic title"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="officialNotes">Official Notes</Label>
            <Textarea
              id="officialNotes"
              value={officialNotes}
              onChange={(e) => setOfficialNotes(e.target.value)}
              placeholder="Enter official notes (optional)"
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Topic"
                )}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

