"use client";

import { useState } from "react";
import Image from "next/image";
import { useSessionLibraryStore } from "@/stores/session-library-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Trash2 } from "lucide-react";
import { Card } from "@workspace/ui/components/card";

interface PdfPageGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPages: (pageIds: string[]) => void;
}

export function PdfPageGalleryDialog({
  open,
  onOpenChange,
  onSelectPages,
}: PdfPageGalleryDialogProps) {
  const { pdfPages, clearSessionLibrary } = useSessionLibraryStore();
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set()
  );

  const handleTogglePage = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === pdfPages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pdfPages.map((p) => p.id)));
    }
  };

  const handleUseSelected = () => {
    const selectedIds = Array.from(selectedPageIds);
    if (selectedIds.length > 0) {
      onSelectPages(selectedIds);
      setSelectedPageIds(new Set());
      onOpenChange(false);
    }
  };

  const handleClearLibrary = () => {
    clearSessionLibrary();
    setSelectedPageIds(new Set());
  };

  const handleClose = () => {
    setSelectedPageIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Session Library - PDF Pages</DialogTitle>
          <DialogDescription>
            Select one or more pages to use as slide images. Selected pages will
            be applied to your slides.
          </DialogDescription>
        </DialogHeader>

        {pdfPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm font-medium">No pages in session library</p>
            <p className="text-xs mt-2">
              Upload a PDF to add pages to the library
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8"
                >
                  {selectedPageIds.size === pdfPages.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedPageIds.size} of {pdfPages.length} selected
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLibrary}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Library
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                {pdfPages.map((page) => {
                  const isSelected = selectedPageIds.has(page.id);
                  return (
                    <Card
                      key={page.id}
                      className={`relative cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2"
                          : ""
                      }`}
                      onClick={() => handleTogglePage(page.id)}
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                        <Image
                          src={page.blobUrl}
                          alt={`Page ${page.pageNumber}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTogglePage(page.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background/90"
                          />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                          Page {page.pageNumber}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUseSelected}
            disabled={selectedPageIds.size === 0}
          >
            Use Selected Pages ({selectedPageIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

