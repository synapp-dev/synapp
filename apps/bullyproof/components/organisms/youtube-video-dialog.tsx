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
import { Loader2, Youtube } from "lucide-react";
import { isYouTubeUrl, convertToYouTubeEmbedUrl } from "@/utils/youtube";
import { toast } from "sonner";

interface YouTubeVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVideo: (videoUrl: string) => void;
}

export function YouTubeVideoDialog({
  open,
  onOpenChange,
  onAddVideo,
}: YouTubeVideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setIsValid(false);

    // Validate URL as user types
    if (url.trim()) {
      setIsValidating(true);
      // Small delay to avoid excessive validation
      setTimeout(() => {
        const valid = isYouTubeUrl(url.trim());
        setIsValid(valid);
        setIsValidating(false);
      }, 300);
    }
  };

  const handleAddSlide = () => {
    if (!isValid || !videoUrl.trim()) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    onAddVideo(videoUrl.trim());
    setVideoUrl("");
    setIsValid(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setVideoUrl("");
    setIsValid(false);
    onOpenChange(false);
  };

  const embedUrl = isValid && videoUrl.trim()
    ? convertToYouTubeEmbedUrl(videoUrl.trim())
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add YouTube Video</DialogTitle>
          <DialogDescription>
            Paste a YouTube URL to add it as a video slide. The video will be
            inserted at the selected position.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
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
                Please enter a valid YouTube URL (youtube.com or youtu.be)
              </p>
            )}
            {isValid && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Valid YouTube URL
              </p>
            )}
          </div>

          {/* Video Preview */}
          {embedUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video preview"
                />
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
