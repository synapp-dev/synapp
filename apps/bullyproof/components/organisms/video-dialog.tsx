"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2, Youtube, Video } from "lucide-react";
import { isVideoUrl, getVideoEmbedUrl, isYouTubeUrl, isVimeoUrl } from "@/utils/video";
import { VimeoPlayer } from "./vimeo-player";
import { toast } from "sonner";

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVideo: (videoUrl: string) => void;
}

export function VideoDialog({
  open,
  onOpenChange,
  onAddVideo,
}: VideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [videoType, setVideoType] = useState<"youtube" | "vimeo" | null>(null);

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setIsValid(false);
    setVideoType(null);

    // Validate URL as user types
    if (url.trim()) {
      setIsValidating(true);
      // Small delay to avoid excessive validation
      setTimeout(() => {
        const valid = isVideoUrl(url.trim());
        setIsValid(valid);
        if (valid) {
          if (isYouTubeUrl(url.trim())) {
            setVideoType("youtube");
          } else if (isVimeoUrl(url.trim())) {
            setVideoType("vimeo");
          }
        }
        setIsValidating(false);
      }, 300);
    }
  };

  const handleAddSlide = () => {
    if (!isValid || !videoUrl.trim()) {
      toast.error("Please enter a valid YouTube or Vimeo URL");
      return;
    }

    onAddVideo(videoUrl.trim());
    setVideoUrl("");
    setIsValid(false);
    setVideoType(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setVideoUrl("");
    setIsValid(false);
    setVideoType(null);
    onOpenChange(false);
  };

  const embedUrl = isValid && videoUrl.trim()
    ? getVideoEmbedUrl(videoUrl.trim())
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
          <DialogDescription>
            Paste a YouTube or Vimeo URL to add it as a video slide. The video will be
            inserted at the selected position.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              value={videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="font-mono text-sm"
            />
            {isValidating && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Validating URL...
              </p>
            )}
            {videoUrl.trim() && !isValidating && !isValid && (
              <p className="text-sm text-destructive">
                Please enter a valid YouTube URL (youtube.com or youtu.be) or Vimeo URL (vimeo.com)
              </p>
            )}
            {isValid && videoType && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                {videoType === "youtube" ? (
                  <Youtube className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Valid {videoType === "youtube" ? "YouTube" : "Vimeo"} URL
              </p>
            )}
          </div>

          {/* Video Preview */}
          {embedUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                {isVimeoUrl(videoUrl.trim()) ? (
                  <VimeoPlayer
                    videoUrl={videoUrl.trim()}
                    className="w-full h-full"
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video preview"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAddSlide} disabled={!isValid || !videoUrl.trim()}>
            Add Slide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
