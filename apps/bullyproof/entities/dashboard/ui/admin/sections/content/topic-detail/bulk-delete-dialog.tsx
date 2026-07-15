"use client";

import { compareSlidesByPosition } from "@/lib/fractional-position";
import { SlideRenderer } from "@/components/organisms/slide-renderer";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import type { ExtendedSlideData } from "./types";

// Bulk Delete Slides Dialog
export function BulkDeleteDialog({
  showBulkDeleteDialog,
  setShowBulkDeleteDialog,
  bulkDeleteSelectedIds,
  setBulkDeleteSelectedIds,
  localSlides,
  deletedSlideIds,
  setDeletedSlideIds,
  setHasUnsavedChanges,
  currentSlide,
  currentSlideIndex,
  setCurrentSlideIndex,
  isCertification,
}: {
  showBulkDeleteDialog: boolean;
  setShowBulkDeleteDialog: (open: boolean) => void;
  bulkDeleteSelectedIds: Set<string>;
  setBulkDeleteSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  localSlides: ExtendedSlideData[];
  deletedSlideIds: Set<string>;
  setDeletedSlideIds: (ids: Set<string>) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  currentSlide: ExtendedSlideData | undefined;
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  isCertification: boolean;
}) {
  return (
    <Dialog
      open={showBulkDeleteDialog}
      onOpenChange={(open) => {
        if (!open) setBulkDeleteSelectedIds(new Set());
        setShowBulkDeleteDialog(open);
      }}
    >
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Delete Slides</DialogTitle>
          <DialogDescription>
            Select slides to remove. Changes are local until you click Save
            Changes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-0 flex-1 gap-4">
          <div className="flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const slidesForBulk =
                    localSlides.filter((s) => !deletedSlideIds.has(s.id)) ??
                    [];
                  if (bulkDeleteSelectedIds.size === slidesForBulk.length) {
                    setBulkDeleteSelectedIds(new Set());
                  } else {
                    setBulkDeleteSelectedIds(
                      new Set(slidesForBulk.map((s) => s.id)),
                    );
                  }
                }}
                className="h-8"
              >
                {(() => {
                  const slidesForBulk = localSlides.filter(
                    (s) => !deletedSlideIds.has(s.id),
                  );
                  return bulkDeleteSelectedIds.size === slidesForBulk.length
                    ? "Deselect All"
                    : "Select All";
                })()}
              </Button>
              <span className="text-sm text-muted-foreground">
                {bulkDeleteSelectedIds.size} of{" "}
                {localSlides.filter((s) => !deletedSlideIds.has(s.id)).length}{" "}
                selected
              </span>
            </div>
          </div>
          <ScrollArea className="h-[320px] rounded-md border">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              {localSlides
                .filter((s) => !deletedSlideIds.has(s.id))
                .sort(compareSlidesByPosition)
                .map((slide, index) => {
                  const isSelected = bulkDeleteSelectedIds.has(slide.id);
                  return (
                    <Card
                      key={slide.id}
                      className={`relative cursor-pointer transition-all hover:shadow-md overflow-hidden p-0 gap-0 flex flex-col ${
                        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      onClick={() => {
                        setBulkDeleteSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(slide.id)) {
                            next.delete(slide.id);
                          } else {
                            next.add(slide.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <div
                        className="relative w-full overflow-hidden bg-muted"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <SlideRenderer
                          slide={slide}
                          className="w-full h-full [&_img]:object-cover [&_video]:object-cover"
                          thumbnailOnly={true}
                          isCertification={isCertification}
                        />
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              setBulkDeleteSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(slide.id)) {
                                  next.delete(slide.id);
                                } else {
                                  next.add(slide.id);
                                }
                                return next;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background/90"
                          />
                        </div>
                      </div>
                      <div className="px-2 py-1 text-center text-xs font-medium text-muted-foreground border-t bg-muted/30 flex-shrink-0">
                        Slide {index + 1}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setBulkDeleteSelectedIds(new Set());
              setShowBulkDeleteDialog(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const selectedIds = Array.from(bulkDeleteSelectedIds);
              if (selectedIds.length === 0) return;

              const newDeletedIds = new Set(deletedSlideIds);
              for (const id of selectedIds) {
                newDeletedIds.add(id);
              }
              setDeletedSlideIds(newDeletedIds);
              setHasUnsavedChanges(true);
              setBulkDeleteSelectedIds(new Set());
              setShowBulkDeleteDialog(false);

              const remainingSlides = localSlides.filter(
                (s) => !newDeletedIds.has(s.id),
              );
              const currentSlideId = currentSlide?.id;
              // Always ensure currentSlideIndex is valid after bulk delete
              if (
                currentSlideId &&
                remainingSlides.some((s) => s.id === currentSlideId)
              ) {
                // Current slide survived: find its new index
                const newIndex = remainingSlides.findIndex(
                  (s) => s.id === currentSlideId,
                );
                if (newIndex >= 0) setCurrentSlideIndex(newIndex);
              } else {
                // Current slide was deleted or undefined: clamp to valid range
                const newIndex = Math.max(
                  0,
                  Math.min(currentSlideIndex, remainingSlides.length - 1),
                );
                setCurrentSlideIndex(newIndex);
              }
            }}
            disabled={bulkDeleteSelectedIds.size === 0}
          >
            Delete Selected ({bulkDeleteSelectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
