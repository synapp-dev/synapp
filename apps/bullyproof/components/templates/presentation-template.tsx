"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface Slide {
  id: string;
  title: string;
  content: React.ReactNode;
  thumbnail?: string;
}

interface PresentationTemplateProps {
  slides: Slide[];
  title?: string;
  onSlideChange?: (slideId: string) => void;
}

export function PresentationTemplate({
  slides,
  title = "Presentation",
  onSlideChange,
}: PresentationTemplateProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length && slides[index]) {
      setCurrentSlideIndex(index);
      onSlideChange?.(slides[index].id);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      goToSlide(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={togglePlayPause}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500 ml-4">
            {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main slide view */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
          <Card className="w-full max-w-4xl aspect-video shadow-lg">
            <CardContent className="h-full p-8 flex flex-col justify-center">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-6 text-gray-900">
                  {currentSlide?.title}
                </h2>
                <div className="text-lg text-gray-700">
                  {currentSlide?.content}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with slide thumbnails */}
        <div className="w-80 bg-white border-l overflow-y-auto max-h-96">
          <div className="p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Slides</h2>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <Card
                  key={slide.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    currentSlideIndex === index
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => goToSlide(index)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {index + 1}
                      </span>
                      <CardTitle className="text-sm line-clamp-2">
                        {slide.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {slide.thumbnail ? (
                      <div className="aspect-video bg-gray-100 rounded border">
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic runtime src (user upload / storage / object URL); next/image not applicable */}
                        <img
                          src={slide.thumbnail}
                          alt={slide.title}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                        <span className="text-xs text-gray-400">
                          No preview
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
