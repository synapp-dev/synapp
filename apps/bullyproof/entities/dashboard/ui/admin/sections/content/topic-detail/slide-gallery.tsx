"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { SlideRenderer } from "@/components/organisms/slide-renderer";

import { SortableSlideItem } from "./sortable-slide-item";
import type { ExtendedSlideData } from "./types";

// Second Row: Slide Gallery with Navigation
export function SlideGallery({
  slides,
  currentSlideIndex,
  setCurrentSlideIndex,
  activeSlideId,
  slideRefreshKey,
  isReordering,
  isCreatingSlide,
  isCertification,
  hoveredSlideIndex,
  setHoveredSlideIndex,
  showAddButton,
  setShowAddButton,
  canGoPrev,
  canGoNext,
  goToPrevious,
  goToNext,
  sensors,
  handleDragStart,
  handleDragEnd,
  handleDragCancel,
  handleCreateSlide,
  setGalleryRef,
}: {
  slides: ExtendedSlideData[];
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  activeSlideId: string | null;
  slideRefreshKey: number;
  isReordering: boolean;
  isCreatingSlide: boolean;
  isCertification: boolean;
  hoveredSlideIndex: number | null;
  setHoveredSlideIndex: (index: number | null) => void;
  showAddButton: number | null;
  setShowAddButton: React.Dispatch<React.SetStateAction<number | null>>;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  handleCreateSlide: (insertAfterIndex: number) => void;
  setGalleryRef: (element: HTMLDivElement | null) => void;
}) {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="relative overflow-visible p-0 border-none shadow-none">
      <CardContent className="relative space-y-4 overflow-visible p-0 border-none">
        {/* Navigation Controls */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground px-4">
              Slide {currentSlideIndex + 1} of {slides.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={!canGoNext}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Slide Gallery */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              ref={setGalleryRef}
              className="flex gap-4 overflow-x-auto overflow-y-visible py-3 px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent relative"
              onMouseLeave={() => {
                // Clear all hover states when leaving the gallery
                setHoveredSlideIndex(null);
                setShowAddButton(null);
                // Clear any pending timeouts
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                if (hideButtonTimeoutRef.current) {
                  clearTimeout(hideButtonTimeoutRef.current);
                  hideButtonTimeoutRef.current = null;
                }
              }}
            >
              {slides.map((slide, index) => {
                const isLastSlide = index === slides.length - 1;

                return (
                  <SortableSlideItem
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isActive={activeSlideId === slide.id}
                    currentSlideIndex={currentSlideIndex}
                    slideRefreshKey={slideRefreshKey}
                    isReordering={isReordering}
                    hoveredSlideIndex={hoveredSlideIndex}
                    showAddButton={showAddButton}
                    isCertification={isCertification}
                    onSlideClick={() => {
                      if (!isReordering) {
                        setCurrentSlideIndex(index);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!activeSlideId && !isReordering) {
                        setHoveredSlideIndex(index);
                        // Don't show add button on hover for the last slide (it's always visible)
                        if (!isLastSlide) {
                          // Clear any existing timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          // Set timeout to show button after 300ms
                          hoverTimeoutRef.current = setTimeout(() => {
                            setShowAddButton(index);
                          }, 300);
                        } else {
                          setShowAddButton(index);
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredSlideIndex(null);
                      // Don't hide add button for the last slide (it's always visible)
                      if (!isLastSlide) {
                        // Clear timeout if mouse leaves before 300ms
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        // Hide button after a short delay to allow moving to button
                        if (hideButtonTimeoutRef.current) {
                          clearTimeout(hideButtonTimeoutRef.current);
                        }
                        hideButtonTimeoutRef.current = setTimeout(() => {
                          setShowAddButton((current) => {
                            // Only hide if we're not hovering over the button itself
                            return current === index ? null : current;
                          });
                        }, 200);
                      }
                    }}
                    onCreateSlide={() => {
                      handleCreateSlide(index);
                    }}
                    hoverTimeoutRef={hoverTimeoutRef}
                    hideButtonTimeoutRef={hideButtonTimeoutRef}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeSlideId
                ? (() => {
                    const draggedIndex = slides.findIndex(
                      (s) => s.id === activeSlideId,
                    );
                    const draggedSlide = slides[draggedIndex];
                    if (!draggedSlide) return null;
                    return (
                      <div
                        className="flex-shrink-0 relative rounded-lg overflow-hidden shadow-lg bg-background opacity-90 rotate-3 scale-105"
                        style={{
                          width: "180px",
                          aspectRatio: "16 / 9",
                        }}
                      >
                        <div className="w-full h-full relative">
                          <SlideRenderer
                            slide={draggedSlide}
                            className="w-full h-full"
                            thumbnailOnly={true}
                            isCertification={isCertification}
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                          Slide {draggedIndex + 1}
                        </div>
                      </div>
                    );
                  })()
                : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
        {(isReordering || isCreatingSlide) && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isCreatingSlide
                  ? "Creating slide..."
                  : "Reordering slides..."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
