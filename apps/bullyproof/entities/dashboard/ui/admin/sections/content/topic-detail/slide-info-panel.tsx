"use client";

import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Info,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";

import type { ExtendedSlideData } from "./types";

// Slide Information Panel - 2/5 width
export function SlideInfoPanel({
  slides,
  currentSlide,
  currentSlideIndex,
  isCertification,
  isImageOrVideo,
  isDeletingSlide,
  isUploading,
  isDragging,
  imageUrlValue,
  videoUrlValue,
  uploadError,
  uploadButtonRef,
  setShowDeleteDialog,
  setShowImageSelectorDialog,
  handleTypeChange,
  handleVideoUrlChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}: {
  slides: ExtendedSlideData[];
  currentSlide: ExtendedSlideData;
  currentSlideIndex: number;
  isCertification: boolean;
  isImageOrVideo: boolean;
  isDeletingSlide: boolean;
  isUploading: boolean;
  isDragging: boolean;
  imageUrlValue: string;
  videoUrlValue: string;
  uploadError: string | null;
  uploadButtonRef: React.RefObject<HTMLButtonElement | null>;
  setShowDeleteDialog: (open: boolean) => void;
  setShowImageSelectorDialog: (open: boolean) => void;
  handleTypeChange: (newType: string) => void;
  handleVideoUrlChange: (newUrl: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div className="col-span-2 h-full">
      <Card className="p-6 h-full">
        <Tabs
          defaultValue="information"
          className="w-full h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Slide {currentSlideIndex + 1} of {slides.length}
            </p>
            <div className="flex items-center gap-2">
              <TabsList className="h-8 w-auto">
                <TabsTrigger
                  value="information"
                  className="h-7 px-3 text-xs"
                >
                  <Info className="h-3 w-3" />
                  Information
                </TabsTrigger>
                <TabsTrigger value="notes" className="h-7 px-3 text-xs">
                  <StickyNote className="h-3 w-3" />
                  Notes
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeletingSlide}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent
            value="information"
            className="mt-0 flex-1 flex flex-col"
          >
            <div className="space-y-4 flex-shrink-0">
              {isImageOrVideo && (
                <div className="space-y-2">
                  <Label>Slide Type</Label>
                  <Select
                    value={currentSlide.kind}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        {currentSlide.kind === "image" ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : currentSlide.kind === "video" ? (
                          <VideoIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span className="capitalize">
                          {currentSlide.kind}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {!isCertification && (
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Text
                          </div>
                        </SelectItem>
                      )}
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <VideoIcon className="h-4 w-4" />
                          Video
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Image/Video URL Inputs */}
              {currentSlide.kind === "image" && (
                <div className="space-y-3 flex-shrink-0">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input
                    id="image-url"
                    value={imageUrlValue}
                    readOnly
                    disabled
                    className="truncate bg-muted cursor-not-allowed"
                    placeholder="No image URL set"
                  />
                  {uploadError && (
                    <p className="text-sm text-destructive">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Change Image Button - fills remaining space */}
            {currentSlide.kind === "image" && (
              <div className="flex-1 flex items-end mt-auto pt-4">
                <Button
                  ref={uploadButtonRef}
                  type="button"
                  variant="outline"
                  onClick={() => setShowImageSelectorDialog(true)}
                  disabled={isUploading}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full h-full min-h-[120px] text-base flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all !shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
                    isDragging
                      ? "border-primary bg-primary/10 !shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)]"
                      : "border-muted-foreground/30 bg-muted/5 hover:border-muted-foreground/50 hover:bg-muted/10"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6" />
                      <span>Click to change image</span>
                    </>
                  )}
                </Button>
              </div>
            )}
            {currentSlide.kind === "video" && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  value={videoUrlValue}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  disabled={isUploading}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-0 flex-1">
            <div className="space-y-2 h-full">
              <Tabs
                defaultValue="official"
                className="w-full h-full flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="official">
                    Official Notes
                  </TabsTrigger>
                  <TabsTrigger value="teacher">
                    Teacher Notes
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="official" className="mt-4 flex-1">
                  {currentSlide.effectiveNotes ? (
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
                      {currentSlide.effectiveNotes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      No official notes available for this slide.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="teacher" className="mt-4 flex-1">
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    No teacher notes available for this slide.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
