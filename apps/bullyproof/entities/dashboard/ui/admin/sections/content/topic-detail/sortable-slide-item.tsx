"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripHorizontal } from "lucide-react";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

// Sortable slide item component
export function SortableSlideItem({
  slide,
  index,
  currentSlideIndex,
  slideRefreshKey,
  isReordering,
  showAddButton,
  isCertification,
  onSlideClick,
  onMouseEnter,
  onMouseLeave,
  onCreateSlide,
  hideButtonTimeoutRef,
}: {
  slide: SlideData;
  index: number;
  isActive: boolean;
  currentSlideIndex: number;
  slideRefreshKey: number;
  isReordering: boolean;
  hoveredSlideIndex: number | null;
  showAddButton: number | null;
  isCertification: boolean;
  onSlideClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCreateSlide: () => void;
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  hideButtonTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Show add button if this slide index matches showAddButton
  const showAddButtonForSlide =
    showAddButton === index && !isDragging && !isReordering;

  return (
    <div className="flex items-center relative" ref={setNodeRef} style={style}>
      {/* Slide button */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          if (!isReordering) {
            onSlideClick();
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          flex-shrink-0 relative group transition-all rounded-lg overflow-hidden shadow-lg bg-background
          ${
            isReordering
              ? "cursor-wait opacity-50"
              : "cursor-grab active:cursor-grabbing"
          }
          ${
            index === currentSlideIndex
              ? "ring-2 ring-primary ring-offset-2 scale-105"
              : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
          }
          ${isDragging ? "opacity-30 scale-90" : ""}
        `}
        style={{
          width: "180px",
          aspectRatio: "16 / 9",
        }}
      >
        {/* Drag handle indicator */}
        {!isDragging && (
          <div className="absolute top-2 right-2 z-10 bg-background/80 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="w-full h-full relative">
          <SlideRenderer
            key={`${slide.id}-${slideRefreshKey}`}
            slide={slide}
            className="w-full h-full"
            thumbnailOnly={true}
            isCertification={isCertification}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
          Slide {index + 1}
        </div>
      </button>

      {/* Add slide button */}
      <div
        className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
        style={{
          width: showAddButtonForSlide ? "48px" : "0px",
          opacity: showAddButtonForSlide ? 1 : 0,
        }}
        onMouseEnter={() => {
          if (hideButtonTimeoutRef.current) {
            clearTimeout(hideButtonTimeoutRef.current);
            hideButtonTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          if (hideButtonTimeoutRef.current) {
            clearTimeout(hideButtonTimeoutRef.current);
          }
          hideButtonTimeoutRef.current = setTimeout(() => {
            // This will be handled by parent
          }, 200);
        }}
      >
        {showAddButtonForSlide && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSlide();
                }}
                className="h-10 w-12 rounded-lg bg-background/50 border-2 border-dashed border-muted-foreground/40 shadow-sm flex items-center justify-center hover:bg-background/80 hover:border-muted-foreground/60 transition-all cursor-pointer ml-4"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add slide</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
