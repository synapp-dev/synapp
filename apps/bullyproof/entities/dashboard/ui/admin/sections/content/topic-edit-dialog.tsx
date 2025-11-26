"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Loader2,
  FileText,
  Image,
  Video,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

type Slide = typeof topicSlides.$inferSelect;

interface TopicEditDialogProps {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopicEditDialog({
  topicId,
  open,
  onOpenChange,
}: TopicEditDialogProps) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !topicId) {
      setTopic(null);
      setError(null);
      setSlides([]);
      setEditingSlideId(null);
      return;
    }

    const fetchTopic = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await topicsApi.get.byId(topicId);
        if (result.data) {
          setTopic(result.data);
          setSlides(
            (result.data.slides ?? []).sort(
              (a, b) => a.orderIndex - b.orderIndex
            )
          );
        } else if (result.error) {
          setError(result.error.message ?? "Failed to fetch topic");
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch topic details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [open, topicId]);

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const newSlides = [...slides];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newSlides.length) return;

    // Swap orderIndex values
    const tempOrder = newSlides[index].orderIndex;
    newSlides[index].orderIndex = newSlides[newIndex].orderIndex;
    newSlides[newIndex].orderIndex = tempOrder;

    // Swap array positions
    [newSlides[index], newSlides[newIndex]] = [
      newSlides[newIndex],
      newSlides[index],
    ];

    // Re-sort by orderIndex
    setSlides(newSlides.sort((a, b) => a.orderIndex - b.orderIndex));
  };

  const handleDeleteSlide = (slideId: string) => {
    if (confirm("Are you sure you want to delete this slide?")) {
      setSlides((prev) => prev.filter((s) => s.id !== slideId));
      if (editingSlideId === slideId) {
        setEditingSlideId(null);
      }
    }
  };

  const handleSaveSlide = (slideId: string, updatedSlide: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, ...updatedSlide } : s))
    );
    setEditingSlideId(null);
  };

  const handleAddSlide = () => {
    const newOrderIndex =
      slides.length > 0 ? Math.max(...slides.map((s) => s.orderIndex)) + 1 : 0;
    const newSlide: Slide = {
      id: `temp-${Date.now()}`,
      topicId: topicId!,
      orderIndex: newOrderIndex,
      kind: "text",
      textHtml: "",
      imageUrl: null,
      videoUrl: null,
      videoStartS: null,
      videoEndS: null,
      officialNotes: null,
      durationSec: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSlides([...slides, newSlide].sort((a, b) => a.orderIndex - b.orderIndex));
    setEditingSlideId(newSlide.id);
  };

  const handleSaveAll = async () => {
    // Note: This would require backend API endpoints for slide CRUD operations
    // For now, this is a placeholder that shows the UI is ready
    setIsSaving(true);
    try {
      // TODO: Implement API calls to save slides
      console.log("Saving slides:", slides);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Slide changes saved! (Note: Backend API endpoints needed for persistence)");
    } catch (err) {
      console.error("Failed to save slides:", err);
      alert("Failed to save slides. Please check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const getSlideIcon = (kind: string) => {
    switch (kind) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSlideBadgeVariant = (kind: string) => {
    switch (kind) {
      case "text":
        return "default" as const;
      case "image":
        return "secondary" as const;
      case "video":
        return "outline" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <Dialog open={open && topicId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Edit Topic: {topic?.title || "Loading..."}
          </DialogTitle>
          <DialogDescription>
            {topic?.stage?.name || "Loading..."} • {slides.length} slide(s)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading slides...</p>
            </div>
          ) : error ? (
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading slides</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <Card key={slide.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {getSlideIcon(slide.kind)}
                        <span>Slide {slide.orderIndex + 1}</span>
                        <Badge variant={getSlideBadgeVariant(slide.kind)}>
                          {slide.kind}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveSlide(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveSlide(index, "down")}
                          disabled={index === slides.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingSlideId(
                              editingSlideId === slide.id ? null : slide.id
                            )
                          }
                        >
                          {editingSlideId === slide.id ? "Cancel" : "Edit"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingSlideId === slide.id ? (
                      <SlideEditForm
                        slide={slide}
                        onSave={(updated) => handleSaveSlide(slide.id, updated)}
                        onCancel={() => setEditingSlideId(null)}
                      />
                    ) : (
                      <SlidePreview slide={slide} />
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={handleAddSlide}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Slide
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlidePreview({ slide }: { slide: Slide }) {
  return (
    <div className="space-y-4">
      {slide.kind === "text" && slide.textHtml && (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: slide.textHtml }}
        />
      )}
      {slide.kind === "image" && slide.imageUrl && (
        <div className="space-y-2">
          <img
            src={slide.imageUrl}
            alt={`Slide ${slide.orderIndex}`}
            className="w-full rounded-md border max-h-64 object-contain"
          />
          {slide.officialNotes && (
            <p className="text-sm text-muted-foreground">
              Notes: {slide.officialNotes}
            </p>
          )}
        </div>
      )}
      {slide.kind === "video" && slide.videoUrl && (
        <div className="space-y-2">
          <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
            <video
              src={slide.videoUrl}
              controls
              className="w-full h-full"
            />
          </div>
          {(slide.videoStartS !== null || slide.videoEndS !== null) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {slide.videoStartS !== null && (
                <span>Start: {slide.videoStartS}s</span>
              )}
              {slide.videoEndS !== null && <span>End: {slide.videoEndS}s</span>}
            </div>
          )}
          {slide.officialNotes && (
            <p className="text-sm text-muted-foreground">
              Notes: {slide.officialNotes}
            </p>
          )}
        </div>
      )}
      {slide.durationSec !== null && (
        <div className="text-xs text-muted-foreground">
          Duration: {slide.durationSec}s
        </div>
      )}
    </div>
  );
}

function SlideEditForm({
  slide,
  onSave,
  onCancel,
}: {
  slide: Slide;
  onSave: (updated: Partial<Slide>) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState(slide.kind);
  const [textHtml, setTextHtml] = useState(slide.textHtml ?? "");
  const [imageUrl, setImageUrl] = useState(slide.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(slide.videoUrl ?? "");
  const [videoStartS, setVideoStartS] = useState(
    slide.videoStartS?.toString() ?? ""
  );
  const [videoEndS, setVideoEndS] = useState(
    slide.videoEndS?.toString() ?? ""
  );
  const [officialNotes, setOfficialNotes] = useState(
    slide.officialNotes ?? ""
  );
  const [durationSec, setDurationSec] = useState(
    slide.durationSec?.toString() ?? ""
  );

  const handleSave = () => {
    const updated: Partial<Slide> = {
      kind,
      officialNotes: officialNotes || null,
      durationSec: durationSec ? parseInt(durationSec) : null,
    };

    if (kind === "text") {
      updated.textHtml = textHtml || null;
      updated.imageUrl = null;
      updated.videoUrl = null;
    } else if (kind === "image") {
      updated.imageUrl = imageUrl || null;
      updated.textHtml = null;
      updated.videoUrl = null;
    } else if (kind === "video") {
      updated.videoUrl = videoUrl || null;
      updated.textHtml = null;
      updated.imageUrl = null;
      updated.videoStartS = videoStartS ? parseInt(videoStartS) : null;
      updated.videoEndS = videoEndS ? parseInt(videoEndS) : null;
    }

    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Slide Type</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {kind === "text" && (
        <div className="space-y-2">
          <Label>Content (HTML)</Label>
          <Textarea
            value={textHtml}
            onChange={(e) => setTextHtml(e.target.value)}
            placeholder="Enter HTML content..."
            rows={6}
          />
        </div>
      )}

      {kind === "image" && (
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full rounded-md border max-h-64 object-contain"
            />
          )}
        </div>
      )}

      {kind === "video" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (seconds)</Label>
              <Input
                type="number"
                value={videoStartS}
                onChange={(e) => setVideoStartS(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>End Time (seconds)</Label>
              <Input
                type="number"
                value={videoEndS}
                onChange={(e) => setVideoEndS(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {videoUrl && (
            <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
              <video
                src={videoUrl}
                controls
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Official Notes</Label>
        <Textarea
          value={officialNotes}
          onChange={(e) => setOfficialNotes(e.target.value)}
          placeholder="Enter notes for this slide..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Duration (seconds)</Label>
        <Input
          type="number"
          value={durationSec}
          onChange={(e) => setDurationSec(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

