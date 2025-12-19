"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationTopics,
  certificationSlides,
} from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Plus,
  Trash2,
  Check,
  FileQuestion,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  QuizSlideEditor,
  type QuizData,
} from "@/components/organisms/quiz-slide-editor";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";

type Topic = typeof certificationTopics.$inferSelect & {
  slides?: Array<typeof certificationSlides.$inferSelect>;
};

interface CertificationTopicDetailSectionProps {
  topicId: string;
}

type CertificationSlideData = SlideData & {
  quizData?: QuizData | null;
};

export function CertificationTopicDetailSection({
  topicId,
}: CertificationTopicDetailSectionProps) {
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrlValue, setImageUrlValue] = useState<string>("");
  const [videoUrlValue, setVideoUrlValue] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingSlide, setIsDeletingSlide] = useState(false);

  // Local state for slides (working copy)
  const [localSlides, setLocalSlides] = useState<CertificationSlideData[]>([]);
  const [pendingFileUploads, setPendingFileUploads] = useState<
    Map<string, File>
  >(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedSlideIds, setDeletedSlideIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch topic with slides
        const topicResult = await certificationApi.topics.byId(topicId);
        if (!topicResult.data) {
          setError(
            topicResult.error?.message ?? "Failed to fetch certification topic"
          );
          return;
        }

        setTopic(topicResult.data);

        // Fetch slides separately
        const slidesResult = await certificationApi.topics.slides.list(topicId);
        if (slidesResult.data) {
          const initialSlides = slidesResult.data
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((slide) => ({
              id: slide.id,
              kind: slide.kind as "image" | "video" | "quiz" | "test",
              orderIndex: slide.orderIndex,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              quizData: slide.quizData as QuizData | null,
            }));
          setLocalSlides(initialSlides);
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

    fetchData();
  }, [topicId]);

  const slides = localSlides.filter((s) => !deletedSlideIds.has(s.id));
  const currentSlide = slides[currentSlideIndex];
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  const handleAddSlide = async () => {
    if (!topic) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSlide: CertificationSlideData = {
      id: tempId,
      kind: "image",
      orderIndex: slides.length,
      imageUrl: null,
      videoUrl: null,
      textHtml: null,
      videoStartS: null,
      videoEndS: null,
      quizData: null,
    };

    setLocalSlides([...localSlides, newSlide]);
    setCurrentSlideIndex(slides.length);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSlide = async () => {
    if (!currentSlide || isDeletingSlide) return;

    setIsDeletingSlide(true);
    try {
      if (currentSlide.id.startsWith("temp_")) {
        // Just remove from local state
        setLocalSlides(localSlides.filter((s) => s.id !== currentSlide.id));
        setDeletedSlideIds(new Set(deletedSlideIds));
      } else {
        // Mark for deletion
        const newDeletedIds = new Set(deletedSlideIds);
        newDeletedIds.add(currentSlide.id);
        setDeletedSlideIds(newDeletedIds);
      }

      // Adjust current slide index
      if (currentSlideIndex >= slides.length - 1 && currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      }

      setHasUnsavedChanges(true);
    } finally {
      setIsDeletingSlide(false);
      setShowDeleteDialog(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    if (!currentSlide) return;

    const updatedSlides = localSlides.map((slide) => {
      if (slide.id !== currentSlide.id) return slide;

      if (newType === "image") {
        return {
          ...slide,
          kind: "image" as const,
          imageUrl: slide.imageUrl || null,
          videoUrl: null,
          textHtml: null,
          quizData: null,
        };
      } else if (newType === "video") {
        return {
          ...slide,
          kind: "video" as const,
          videoUrl: slide.videoUrl || null,
          imageUrl: null,
          textHtml: null,
          quizData: null,
        };
      } else if (newType === "quiz") {
        return {
          ...slide,
          kind: "quiz" as const,
          quizData: slide.quizData || {
            question: "",
            answers: [
              { id: `answer_${Date.now()}_1`, text: "", isCorrect: false },
              { id: `answer_${Date.now()}_2`, text: "", isCorrect: false },
            ],
          },
          imageUrl: null,
          videoUrl: null,
          textHtml: null,
        };
      }
      return slide;
    });

    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleQuizDataChange = (quizData: QuizData | null) => {
    if (!currentSlide) return;

    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id
        ? { ...slide, quizData: quizData || null }
        : slide
    );

    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentSlide) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const newPendingUploads = new Map(pendingFileUploads);
    newPendingUploads.set(currentSlide.id, file);
    setPendingFileUploads(newPendingUploads);

    const previewUrl = URL.createObjectURL(file);
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id ? { ...slide, imageUrl: previewUrl } : slide
    );
    setLocalSlides(updatedSlides);
    setImageUrlValue(previewUrl);
    setHasUnsavedChanges(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVideoUrlChange = (newUrl: string) => {
    if (!currentSlide) return;

    setVideoUrlValue(newUrl);
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id
        ? { ...slide, videoUrl: newUrl || null }
        : slide
    );
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleBulkSave = async () => {
    if (!topic || isSaving || !hasUnsavedChanges) return;

    setIsSaving(true);

    try {
      const activeSlides = localSlides.filter(
        (s) => !deletedSlideIds.has(s.id)
      );
      const sortedSlides = [...activeSlides].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );

      const creates: any[] = [];
      const updates: any[] = [];
      const slideIds: string[] = [];

      for (let i = 0; i < sortedSlides.length; i++) {
        const slide = sortedSlides[i];
        if (slide.id.startsWith("temp_")) {
          creates.push({
            tempId: slide.id,
            orderIndex: i,
            kind: slide.kind,
            imageUrl: null,
            videoUrl: slide.videoUrl || null,
            textHtml: slide.textHtml || null,
            videoStartS: slide.videoStartS || null,
            videoEndS: slide.videoEndS || null,
            quizData: slide.quizData || null,
          });
        } else {
          updates.push({
            id: slide.id,
            kind: slide.kind,
            imageUrl: pendingFileUploads.has(slide.id)
              ? null
              : slide.imageUrl || null,
            videoUrl: slide.videoUrl || null,
            textHtml: slide.textHtml || null,
            videoStartS: slide.videoStartS || null,
            videoEndS: slide.videoEndS || null,
            quizData: slide.quizData || null,
          });
          slideIds.push(slide.id);
        }
      }

      const formData = new FormData();
      formData.append(
        "operations",
        JSON.stringify({
          topicId: topic.id,
          creates,
          updates,
          deletes: Array.from(deletedSlideIds),
          reorder: slideIds,
        })
      );

      for (const [slideId, file] of pendingFileUploads.entries()) {
        if (slideId.startsWith("temp_")) {
          formData.append(`file_${slideId}`, file);
        } else {
          formData.append(`file_${slideId}`, file);
        }
      }

      const result = await certificationApi.topics.slides.bulkSave(
        topic.id,
        formData
      );

      if (result.error) {
        throw new Error(result.error.message || "Failed to save changes");
      }

      if (result.data?.topic) {
        const updatedSlides =
          result.data.topic.slides
            ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
            .map((slide: any) => ({
              id: slide.id,
              kind: slide.kind as "image" | "video" | "quiz" | "test",
              orderIndex: slide.orderIndex,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              quizData: slide.quizData as QuizData | null,
            })) ?? [];
        setLocalSlides(updatedSlides);
        setPendingFileUploads(new Map());
        setDeletedSlideIds(new Set());
        setHasUnsavedChanges(false);
        toast.success("Changes saved successfully");
      }
    } catch (err) {
      console.error("Bulk save error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {error || "Topic not found"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={handleBulkSave}
            disabled={!hasUnsavedChanges || isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{topic.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No slides yet. Add your first slide to get started.
              </p>
              <Button onClick={handleAddSlide} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Slide Preview */}
              <div className="lg:col-span-2">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                  {currentSlide && (
                    <SlideRenderer
                      slide={{
                        id: currentSlide.id,
                        kind:
                          currentSlide.kind === "quiz"
                            ? "text"
                            : currentSlide.kind,
                        textHtml:
                          currentSlide.kind === "quiz"
                            ? `<div><h3>${currentSlide.quizData?.question || "Question"}</h3><ul>${currentSlide.quizData?.answers.map((a) => `<li>${a.text}${a.isCorrect ? " ✓" : ""}</li>`).join("") || ""}</ul></div>`
                            : currentSlide.textHtml,
                        imageUrl: currentSlide.imageUrl,
                        videoUrl: currentSlide.videoUrl,
                        videoStartS: currentSlide.videoStartS,
                        videoEndS: currentSlide.videoEndS,
                      }}
                    />
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
                    }
                    disabled={!canGoPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentSlideIndex(
                        Math.min(slides.length - 1, currentSlideIndex + 1)
                      )
                    }
                    disabled={!canGoNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Slide Editor */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Slide Type</Label>
                  <Select
                    value={currentSlide?.kind || "image"}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {currentSlide?.kind === "image" ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : currentSlide?.kind === "video" ? (
                          <VideoIcon className="h-4 w-4" />
                        ) : (
                          <FileQuestion className="h-4 w-4" />
                        )}
                        <span className="capitalize">{currentSlide?.kind}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
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
                      <SelectItem value="quiz">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="h-4 w-4" />
                          Quiz
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentSlide?.kind === "image" && (
                  <>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={imageUrlValue}
                        readOnly
                        disabled
                        className="truncate bg-muted cursor-not-allowed"
                        placeholder="No image URL set"
                      />
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </>
                )}

                {currentSlide?.kind === "video" && (
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input
                      value={videoUrlValue}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {currentSlide?.kind === "quiz" && (
                  <QuizSlideEditor
                    quizData={currentSlide.quizData || null}
                    onChange={handleQuizDataChange}
                  />
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSlide}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slide
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={slides.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slide</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this slide? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSlide}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
