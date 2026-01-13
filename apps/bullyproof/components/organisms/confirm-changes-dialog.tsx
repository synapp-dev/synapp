"use client";

import { Save, ChevronsRight } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { Card } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@workspace/ui/components/hover-card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";

type ChangeItem =
  | {
      type: "delete";
      message: string;
      slideNumber: number;
      slide: SlideData;
    }
  | {
      type: "new";
      message: string;
      slide: SlideData;
      slideNumber: number;
    }
  | {
      type: "replace";
      message: string;
      slideNumber: number;
      slide: SlideData;
      oldSlide: SlideData;
    }
  | {
      type: "reorder";
      message: string;
      slide: SlideData;
      oldPosition: number;
      newPosition: number;
    };

interface CategoryTitleProps {
  symbol: string;
  count: number;
  singularLabel: string;
  pluralLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

function CategoryTitle({
  symbol,
  count,
  singularLabel,
  pluralLabel,
  textColor,
  bgColor,
  borderColor,
}: CategoryTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-medium ${textColor}`}>{symbol}</span>
      <Badge className={`${bgColor} ${textColor} ${borderColor} text-lg px-4`}>
        {count} {count === 1 ? singularLabel : pluralLabel}
      </Badge>
    </div>
  );
}

interface ChangeCardProps {
  slide: SlideData;
  slideNumber: number;
  symbol: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  isCertification?: boolean;
}

function ReplacementCard({
  slide,
  oldSlide,
  slideNumber,
  borderColor,
  bgColor,
  textColor,
  isCertification = false,
}: {
  slide: SlideData;
  oldSlide: SlideData;
  slideNumber: number;
  borderColor: string;
  bgColor: string;
  textColor: string;
  isCertification?: boolean;
}) {
  return (
    <Card
      className={`group relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col ${borderColor}`}
      style={{ gridColumn: "span 2" }}
    >
      <div className="relative w-full overflow-hidden bg-muted flex">
        {/* Old image on left with hover card */}
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="relative w-1/2 aspect-video overflow-hidden border-r-2 border-muted-foreground/20 cursor-pointer">
              <SlideRenderer
                slide={oldSlide}
                thumbnailOnly={true}
                isCertification={isCertification}
              />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-[640px] p-0" side="top">
            <div className="relative w-full aspect-video rounded overflow-hidden bg-muted">
              <SlideRenderer
                slide={oldSlide}
                isCertification={isCertification}
              />
            </div>
          </HoverCardContent>
        </HoverCard>
        {/* Chevrons in middle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-2 border-2 border-muted-foreground/20">
          <ChevronsRight className="h-6 w-6 text-muted-foreground" />
        </div>
        {/* New image on right with hover card */}
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="relative w-1/2 aspect-video overflow-hidden cursor-pointer">
              <SlideRenderer
                slide={slide}
                thumbnailOnly={true}
                isCertification={isCertification}
              />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-[640px] p-0" side="top">
            <div className="relative w-full aspect-video rounded overflow-hidden bg-muted">
              <SlideRenderer slide={slide} isCertification={isCertification} />
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      <div
        className={`w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 ${bgColor} text-secondary`}
      >
        <div className="flex items-center gap-1">
          <span className={`text-sm font-medium ${textColor}`}>+-</span>
        </div>
        <span className={`text-xs font-medium ${textColor}`}>
          Slide {slideNumber}
        </span>
      </div>
    </Card>
  );
}

function ChangeCard({
  slide,
  slideNumber,
  symbol,
  borderColor,
  bgColor,
  textColor,
  isCertification = false,
}: ChangeCardProps) {
  // Regular single-width card
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card
          className={`group relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col ${borderColor}`}
        >
          <div className="relative w-full aspect-video overflow-hidden bg-muted">
            <SlideRenderer
              slide={slide}
              thumbnailOnly={true}
              isCertification={isCertification}
            />
          </div>
          <div
            className={`w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 ${bgColor} text-secondary`}
          >
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${textColor}`}>
                {symbol}
              </span>
            </div>
            <span className={`text-xs font-medium ${textColor}`}>
              Slide {slideNumber}
            </span>
          </div>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-[640px] p-0" side="right">
        <div className="relative w-full aspect-video rounded overflow-hidden bg-muted">
          <SlideRenderer slide={slide} isCertification={isCertification} />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function ReorderCard({
  slide,
  oldPosition,
  newPosition,
  borderColor,
  bgColor,
  textColor,
  isCertification = false,
}: {
  slide: SlideData;
  oldPosition: number;
  newPosition: number;
  borderColor: string;
  bgColor: string;
  textColor: string;
  isCertification?: boolean;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card
          className={`group relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col ${borderColor}`}
        >
          <div className="relative w-full aspect-video overflow-hidden bg-muted">
            <SlideRenderer
              slide={slide}
              thumbnailOnly={true}
              isCertification={isCertification}
            />
          </div>
          <div
            className={`w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 ${bgColor} text-secondary`}
          >
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${textColor}`}>↔</span>
            </div>
            <span className={`text-xs font-medium ${textColor}`}>
              Slide {oldPosition} → {newPosition}
            </span>
          </div>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-[640px] p-0" side="right">
        <div className="relative w-full aspect-video rounded overflow-hidden bg-muted">
          <SlideRenderer slide={slide} isCertification={isCertification} />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface ConfirmChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: ChangeItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isCertification?: boolean;
}

export function ConfirmChangesDialog({
  open,
  onOpenChange,
  changes,
  onConfirm,
  onCancel,
  isSaving = false,
  isCertification = false,
}: ConfirmChangesDialogProps) {
  const replacements = changes.filter((c) => c.type === "replace");
  const additions = changes.filter((c) => c.type === "new");
  const removals = changes.filter((c) => c.type === "delete");
  const reorders = changes.filter((c) => c.type === "reorder");
  const otherChanges = changes.filter(
    (c) =>
      c.type !== "new" &&
      c.type !== "delete" &&
      c.type !== "replace" &&
      c.type !== "reorder"
  );

  const handleDialogOpenChange = (open: boolean) => {
    // Prevent closing dialog while saving
    if (!isSaving) {
      onOpenChange(open);
      if (!open) {
        onCancel();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="!min-w-[50vw] !w-[50vw] !min-h-[80vh] !h-[80vh] max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Save className="h-8 w-8" />
              Confirm Changes
            </DialogTitle>
            <DialogDescription>
              The following changes will be saved!
            </DialogDescription>
          </DialogHeader>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <div className="space-y-8">
                  {/* Replacements */}
                  {replacements.length > 0 && (
                    <div className="space-y-4">
                      <CategoryTitle
                        symbol="+-"
                        count={replacements.length}
                        singularLabel="Replacement"
                        pluralLabel="Replacements"
                        textColor="text-orange-700 dark:text-orange-400"
                        bgColor="bg-orange-50 dark:bg-orange-950/20"
                        borderColor="border-orange-500 dark:border-orange-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {replacements.map((change, index) => (
                          <ReplacementCard
                            key={index}
                            slide={change.slide}
                            oldSlide={change.oldSlide}
                            slideNumber={change.slideNumber}
                            borderColor="border-orange-500 dark:border-orange-600"
                            bgColor="bg-orange-50/50 dark:bg-orange-950/20"
                            textColor="text-orange-700 dark:text-orange-400"
                            isCertification={isCertification}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {replacements.length > 0 && additions.length > 0 && (
                    <Separator />
                  )}

                  {/* Additions */}
                  {additions.length > 0 && (
                    <div className="space-y-4">
                      <CategoryTitle
                        symbol="++"
                        count={additions.length}
                        singularLabel="Addition"
                        pluralLabel="Additions"
                        textColor="text-green-700 dark:text-green-400"
                        bgColor="bg-green-50 dark:bg-green-950/20"
                        borderColor="border-green-500 dark:border-green-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {additions.map((change, index) => (
                          <ChangeCard
                            key={index}
                            slide={change.slide}
                            slideNumber={change.slideNumber}
                            symbol="++"
                            borderColor="border-green-500 dark:border-green-600"
                            bgColor="bg-green-50/50 dark:bg-green-950/20"
                            textColor="text-green-700 dark:text-green-400"
                            isCertification={isCertification}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {additions.length > 0 && removals.length > 0 && <Separator />}

                  {/* Removals */}
                  {removals.length > 0 && (
                    <div className="space-y-4">
                      <CategoryTitle
                        symbol="--"
                        count={removals.length}
                        singularLabel="Removal"
                        pluralLabel="Removals"
                        textColor="text-red-700 dark:text-red-400"
                        bgColor="bg-red-50 dark:bg-red-950/20"
                        borderColor="border-red-500 dark:border-red-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {removals.map((change, index) => (
                          <ChangeCard
                            key={index}
                            slide={change.slide}
                            slideNumber={change.slideNumber}
                            symbol="--"
                            borderColor="border-red-500 dark:border-red-600"
                            bgColor="bg-red-50/50 dark:bg-red-950/20"
                            textColor="text-red-700 dark:text-red-400"
                            isCertification={isCertification}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {removals.length > 0 && reorders.length > 0 && <Separator />}

                  {/* Reorders */}
                  {reorders.length > 0 && (
                    <div className="space-y-4">
                      <CategoryTitle
                        symbol="↔"
                        count={reorders.length}
                        singularLabel="Reordered Slide"
                        pluralLabel="Reordered Slides"
                        textColor="text-blue-700 dark:text-blue-400"
                        bgColor="bg-blue-50 dark:bg-blue-950/20"
                        borderColor="border-blue-500 dark:border-blue-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {reorders.map((change, index) => (
                          <ReorderCard
                            key={index}
                            slide={change.slide}
                            oldPosition={change.oldPosition}
                            newPosition={change.newPosition}
                            borderColor="border-blue-500 dark:border-blue-600"
                            bgColor="bg-blue-50/50 dark:bg-blue-950/20"
                            textColor="text-blue-700 dark:text-blue-400"
                            isCertification={isCertification}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {reorders.length > 0 && otherChanges.length > 0 && (
                    <Separator />
                  )}

                  {/* Other changes */}
                  {otherChanges.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Other Changes</h4>
                      <ul className="space-y-1 text-sm">
                        {otherChanges.map((change, index) => (
                          <li key={index} className="text-muted-foreground">
                            {change.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer with confirmation button */}
          <div className="px-6 py-4 flex items-center justify-center bg-muted/50">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isSaving}
                className="bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
