"use client";

import { cn } from "@workspace/ui/lib/utils";

export type SlideKind = "text" | "image" | "video";

export interface SlideData {
  id: string;
  kind: SlideKind;
  orderIndex: number;
  textHtml?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoStartS?: number | null;
  videoEndS?: number | null;
  effectiveNotes?: string | null;
}

interface SlideRendererProps {
  slide: SlideData;
  className?: string;
}

export function SlideRenderer({ slide, className }: SlideRendererProps) {
  const renderContent = () => {
    switch (slide.kind) {
      case "text":
        return (
          <div
            className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground"
            dangerouslySetInnerHTML={{
              __html: slide.textHtml || "<p>No content</p>",
            }}
          />
        );

      case "image":
        return (
          <div className="flex items-center justify-center h-full w-full">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt="Slide content"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-foreground">No image available</div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="flex items-center justify-center h-full w-full">
            {slide.videoUrl ? (
              <video
                src={slide.videoUrl}
                controls
                className="max-w-full max-h-full rounded-lg shadow-lg"
                {...(slide.videoStartS && { start: slide.videoStartS })}
                {...(slide.videoEndS && { end: slide.videoEndS })}
              />
            ) : (
              <div className="text-foreground">No video available</div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-foreground">Unknown slide type</div>
        );
    }
  };

  return (
    <div className={cn("w-full h-full", className)}>{renderContent()}</div>
  );
}

