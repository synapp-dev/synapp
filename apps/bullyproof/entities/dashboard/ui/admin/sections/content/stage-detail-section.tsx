"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { curriculumStages, topics } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Video,
  Check,
  Edit,
  Plus,
  Save,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import Image from "next/image";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { EditStageSheet } from "./edit-stage-sheet";
import { AddTopicDrawer } from "./add-topic-drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

// Component to handle thumbnail image with error fallback
function ThumbnailImage({ slideId, alt }: { slideId: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const cachedUrl = useTopicSlidesCacheStore(
    (state) => state.cache[slideId]?.url ?? null
  );
  const loading = useTopicSlidesCacheStore(
    (state) => state.loading[slideId] ?? false
  );
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);

  // Fetch URL using cache store (same as SlideRenderer)
  useEffect(() => {
    if (slideId && !slideId.startsWith("temp_")) {
      // If we already have a cached URL, use it immediately
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        return;
      }

      // Otherwise, fetch it
      let cancelled = false;
      getSlideUrl(slideId).then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      setImageUrl(null);
    }
  }, [slideId, getSlideUrl, cachedUrl]);

  // Update when cached URL changes (for instant updates after cache updates)
  useEffect(() => {
    if (cachedUrl && !loading) {
      setImageUrl(cachedUrl);
    }
  }, [cachedUrl, loading]);

  if (loading && !imageUrl) {
    return (
      <div className="w-24 h-14 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-24 h-14 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-24 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted aspect-video">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

type Stage = typeof curriculumStages.$inferSelect & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

type Topic = typeof topics.$inferSelect;

type TopicSlide = {
  id: string;
  topicId: string;
  orderIndex: number;
  kind: "text" | "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  textHtml: string | null;
};

type TopicWithSlides = Topic & {
  slides?: TopicSlide[];
};

interface StageDetailSectionProps {
  slug: string;
}

export function StageDetailSection({ slug }: StageDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [topics, setTopics] = useState<TopicWithSlides[]>([]);
  const [localTopics, setLocalTopics] = useState<TopicWithSlides[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isAddTopicDrawerOpen, setIsAddTopicDrawerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Drag and drop state
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAddButton, setShowAddButton] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStage = async () => {
    if (!slug) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await curriculumApi.stages.byCode(slug);
      if (result.error) {
        setError(
          result.error.message ?? "Failed to fetch curriculum stage details"
        );
      } else if (result.data) {
        setStage(result.data);
      } else {
        setError("Failed to fetch curriculum stage details");
      }
    } catch (err) {
      console.error("Failed to fetch curriculum stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch curriculum stage details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStage();
  }, [slug]);

  const handleStageUpdated = () => {
    fetchStage();
  };

  const handleStageDeleted = () => {
    router.push("/admin/content/curriculum");
  };

  useEffect(() => {
    if (!stage?.id) return;

    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const result = await topicsApi.get.list({ stageId: stage.id });
        if (result.data) {
          // Fetch slides for each topic in parallel
          const topicsWithSlides = await Promise.all(
            result.data.map(async (topic) => {
              try {
                const topicResult = await topicsApi.get.byId(topic.id);
                if (topicResult.data?.slides) {
                  return { ...topic, slides: topicResult.data.slides };
                }
                return { ...topic, slides: [] };
              } catch (err) {
                console.error(
                  `Failed to fetch slides for topic ${topic.id}:`,
                  err
                );
                return { ...topic, slides: [] };
              }
            })
          );
          // Sort by stageOrder
          const sorted = topicsWithSlides.sort((a, b) => {
            if (a.stageOrder === null) return 1;
            if (b.stageOrder === null) return -1;
            return a.stageOrder - b.stageOrder;
          });
          setTopics(sorted);
          setLocalTopics(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [stage?.id]);

  // Sync localTopics with topics when topics change (but not when we're reordering)
  useEffect(() => {
    if (!isReordering && !hasUnsavedChanges) {
      setLocalTopics(topics);
    }
  }, [topics, isReordering, hasUnsavedChanges]);

  const handleTopicClick = (
    topic: TopicWithSlides,
    event?: React.MouseEvent
  ) => {
    // Don't navigate if we're dragging or if it's a temp topic
    if (draggedTopicId || topic.id.startsWith("temp_")) return;

    // Don't navigate if clicking on dropdown menu
    if (
      event &&
      (event.target as HTMLElement).closest("[data-dropdown-menu]")
    ) {
      return;
    }

    // Navigate to topic page using T{stageOrder} format
    if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
      router.push(`/admin/content/curriculum/${slug}/T${topic.stageOrder}`);
    }
  };

  const handleDeleteTopic = async (topic: TopicWithSlides) => {
    if (
      !confirm(
        `Are you sure you want to delete "${topic.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const result = await topicsApi.delete.delete(topic.id);
      if (result.error) {
        toast.error(result.error.message || "Failed to delete topic");
        return;
      }

      // Remove from local state
      setLocalTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setHasUnsavedChanges(false);
      toast.success("Topic deleted successfully");
    } catch (err) {
      console.error("Failed to delete topic:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete topic"
      );
    }
  };

  const handleAddSlideBefore = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at position 0
    if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
      router.push(`/admin/content/curriculum/${slug}/T${topic.stageOrder}`);
    }
  };

  const handleAddSlideAfter = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at the end
    if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
      router.push(`/admin/content/curriculum/${slug}/T${topic.stageOrder}`);
    }
  };

  const getSlideStats = (topic: TopicWithSlides) => {
    // Sort slides by orderIndex to ensure correct order
    const slides = (topic.slides || []).sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    const totalSlides = slides.length;
    const imageSlides = slides.filter((s) => s.kind === "image").length;
    const videoSlides = slides.filter((s) => s.kind === "video").length;

    // Find the first image slide by orderIndex (not just any image slide)
    const firstImageSlide = slides.find(
      (s) => s.kind === "image" && s.imageUrl
    );

    return {
      totalSlides,
      imageSlides,
      videoSlides,
      firstImageSlide,
    };
  };

  // Drag and drop handlers
  const handleTopicDragStart = (topicId: string) => {
    setDraggedTopicId(topicId);
  };

  const handleTopicDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTopicId) {
      setInsertAfterIndex(index);
    }
  };

  const handleTopicDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (
      !(
        relatedTarget instanceof Element &&
        (relatedTarget.closest("[data-drop-zone]") ||
          relatedTarget.closest("button") ||
          relatedTarget.closest("[draggable]"))
      )
    ) {
      setInsertAfterIndex(null);
    }
  };

  const handleTopicDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTopicId || insertAfterIndex === null) {
      setDraggedTopicId(null);
      setInsertAfterIndex(null);
      return;
    }

    const draggedIndex = localTopics.findIndex((t) => t.id === draggedTopicId);
    if (draggedIndex === -1) {
      setDraggedTopicId(null);
      setInsertAfterIndex(null);
      return;
    }

    const targetIndex = insertAfterIndex + 1;

    // Don't do anything if we're dropping at the same position
    if (draggedIndex === targetIndex - 1) {
      setDraggedTopicId(null);
      setInsertAfterIndex(null);
      return;
    }

    // Reorder topics locally
    const newTopics = [...localTopics];
    const [draggedTopic] = newTopics.splice(draggedIndex, 1);
    newTopics.splice(targetIndex, 0, draggedTopic);

    // Update stageOrder for all topics
    const reorderedTopics = newTopics.map((topic, index) => ({
      ...topic,
      stageOrder: index + 1,
    }));

    setLocalTopics(reorderedTopics);
    setHasUnsavedChanges(true);
    setDraggedTopicId(null);
    setInsertAfterIndex(null);
  };

  const handleTopicDragEnd = () => {
    setDraggedTopicId(null);
    setInsertAfterIndex(null);
  };

  // Handle adding new topic
  const handleTopicAdded = (newTopic: TopicWithSlides) => {
    // Add to local topics at the end
    const maxOrder =
      localTopics.length > 0
        ? Math.max(...localTopics.map((t) => t.stageOrder || 0))
        : 0;

    const topicWithOrder = {
      ...newTopic,
      stageOrder: maxOrder + 1,
      slides: [],
    };

    setLocalTopics([...localTopics, topicWithOrder]);
    setHasUnsavedChanges(true);
  };

  // Handle saving changes
  const handleSaveChanges = async () => {
    if (!stage?.id || isSaving) return;

    setIsSaving(true);
    try {
      // Separate existing topics from new topics
      const existingTopics = localTopics.filter(
        (t) => !t.id.startsWith("temp_")
      );
      const newTopics = localTopics.filter((t) => t.id.startsWith("temp_"));

      // First, create new topics
      const createdTopics: TopicWithSlides[] = [];
      for (const newTopic of newTopics) {
        const result = await topicsApi.post.create({
          stageId: stage.id,
          title: newTopic.title,
          officialNotes: newTopic.officialNotes || undefined,
        });

        if (result.data) {
          createdTopics.push(result.data as TopicWithSlides);
        }
      }

      // Combine existing and newly created topics
      const allTopics = [...existingTopics, ...createdTopics];

      // Reorder all topics
      const topicIds = allTopics
        .sort((a, b) => {
          const aOrder = a.stageOrder || 0;
          const bOrder = b.stageOrder || 0;
          return aOrder - bOrder;
        })
        .map((t) => t.id);

      if (topicIds.length > 0) {
        const reorderResult = await topicsApi.reorder({
          stageId: stage.id,
          topicIds,
        });

        if (reorderResult.error) {
          throw new Error(
            reorderResult.error.message || "Failed to reorder topics"
          );
        }
      }

      // Refresh topics
      const result = await topicsApi.get.list({ stageId: stage.id });
      if (result.data) {
        const topicsWithSlides = await Promise.all(
          result.data.map(async (topic) => {
            try {
              const topicResult = await topicsApi.get.byId(topic.id);
              if (topicResult.data?.slides) {
                return { ...topic, slides: topicResult.data.slides };
              }
              return { ...topic, slides: [] };
            } catch (err) {
              return { ...topic, slides: [] };
            }
          })
        );
        const sorted = topicsWithSlides.sort((a, b) => {
          if (a.stageOrder === null) return 1;
          if (b.stageOrder === null) return -1;
          return a.stageOrder - b.stageOrder;
        });
        setTopics(sorted);
        setLocalTopics(sorted);
      }

      setHasUnsavedChanges(false);
      toast.success("Topics saved successfully");
    } catch (err) {
      console.error("Failed to save topics:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save topics");
    } finally {
      setIsSaving(false);
    }
  };

  // Get display topics (localTopics if we have unsaved changes, otherwise topics)
  const displayTopics = hasUnsavedChanges ? localTopics : topics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading curriculum stage...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content/curriculum")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading curriculum stage</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Stage not found</p>
              <p className="text-sm mt-2">
                The curriculum stage you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two Column Layout */}
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Side - Stage Information (1/3 width, sticky) */}
        <div className="w-1/3 flex-shrink-0 sticky top-32 self-start">
          <Card className="p-6 bg-muted/50">
            <div className="space-y-4">
              {/* Stage Header */}
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">
                  {stage.name}
                </h1>
              </div>

              {/* Year Levels */}
              {stage.years && stage.years.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {stage.years.map((year) => (
                    <Badge
                      key={year.id}
                      variant="secondary"
                      className="px-4 py-2 text-base"
                    >
                      {year.displayName}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Edit Button */}
              <Button
                variant="outline"
                onClick={() => setIsEditSheetOpen(true)}
                className="gap-2 w-full"
              >
                <Edit className="h-4 w-4" />
                Edit Stage Information
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side - Topics List (2/3 width, scrollable) */}
        <div className="w-2/3 flex-shrink-0 flex flex-col">
          {/* Topics Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Topics</h2>
            </div>
            {hasUnsavedChanges && (
              <Button onClick={handleSaveChanges} disabled={isSaving}>
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
            )}
          </div>

          {/* Scrollable Topics List */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pr-4">
              {isLoadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : displayTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No topics found for this stage.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayTopics.map((topic, index) => {
                    const {
                      totalSlides,
                      imageSlides,
                      videoSlides,
                      firstImageSlide,
                    } = getSlideStats(topic);
                    const isDragging = draggedTopicId === topic.id;
                    const showInsertBefore = insertAfterIndex === index - 1;
                    const showInsertAfter = insertAfterIndex === index;
                    const showAddButtonForTopic =
                      showAddButton === index &&
                      !draggedTopicId &&
                      !isReordering;

                    return (
                      <div
                        key={topic.id}
                        className="flex flex-col relative w-full"
                      >
                        {/* Drop zone before topic */}
                        <div
                          data-drop-zone
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedTopicId) {
                              handleTopicDragOver(e, index - 1);
                            }
                          }}
                          onDrop={handleTopicDrop}
                          onDragLeave={handleTopicDragLeave}
                          className={`
                      flex-shrink-0 transition-all duration-200 ease-out
                      ${showInsertBefore ? "h-20 w-full mb-3" : "h-0 w-0"}
                      ${showInsertBefore ? "opacity-100" : "opacity-0"}
                      ${draggedTopicId ? "cursor-move" : ""}
                    `}
                        >
                          {showInsertBefore && (
                            <div className="w-full h-full border-2 border-dashed border-primary bg-primary/10 rounded-lg flex flex-col items-center justify-center gap-2">
                              <div className="text-sm font-semibold text-primary">
                                Drop here
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Topic Card */}
                        <Card
                          draggable={
                            !isReordering && !topic.id.startsWith("temp_")
                          }
                          onDragStart={(e) => {
                            if (
                              !isReordering &&
                              !topic.id.startsWith("temp_")
                            ) {
                              handleTopicDragStart(topic.id);
                              e.dataTransfer.effectAllowed = "move";
                            }
                          }}
                          onDragOver={(e) => {
                            if (draggedTopicId) {
                              handleTopicDragOver(e, index);
                            }
                          }}
                          onDragLeave={handleTopicDragLeave}
                          onDrop={handleTopicDrop}
                          onDragEnd={handleTopicDragEnd}
                          onMouseEnter={() => {
                            if (!draggedTopicId && !isReordering) {
                              setHoveredIndex(index);
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                              }
                              hoverTimeoutRef.current = setTimeout(() => {
                                setShowAddButton(index);
                              }, 300);
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredIndex(null);
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }
                            if (hideButtonTimeoutRef.current) {
                              clearTimeout(hideButtonTimeoutRef.current);
                            }
                            hideButtonTimeoutRef.current = setTimeout(() => {
                              setShowAddButton((current) => {
                                return current === index ? null : current;
                              });
                            }, 200);
                          }}
                          className={`
                      cursor-pointer hover:bg-accent/50 transition-all p-0 w-full
                      ${isReordering ? "cursor-wait opacity-50" : ""}
                      ${isDragging ? "opacity-30 scale-95" : ""}
                      ${topic.id.startsWith("temp_") ? "border-2 border-dashed border-primary/50" : ""}
                    `}
                          onClick={(e) => handleTopicClick(topic, e)}
                        >
                          <CardContent className="flex items-center gap-3 p-4">
                            {/* Thumbnail */}
                            {firstImageSlide ? (
                              <ThumbnailImage
                                slideId={firstImageSlide.id}
                                alt={topic.title}
                              />
                            ) : (
                              <div className="w-24 h-14 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}

                            {/* Topic Info */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {topic.stageOrder !== null && (
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                                  {topic.stageOrder}
                                </div>
                              )}
                              <div className="flex items-center flex-1 min-w-0 gap-2">
                                <p className="font-medium truncate">
                                  {topic.title}
                                </p>
                                {topic.status === "published" && (
                                  <Badge className="bg-blue-500 text-white text-xs gap-1">
                                    <Check className="h-3 w-3" />
                                    Published
                                  </Badge>
                                )}
                                {topic.id.startsWith("temp_") && (
                                  <Badge variant="outline" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Slide Stats */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-xs text-muted-foreground">
                                {totalSlides}{" "}
                                {totalSlides === 1 ? "slide" : "slides"}
                              </div>
                              {imageSlides > 0 && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-xs py-0 px-1.5 h-5"
                                >
                                  <ImageIcon className="h-2.5 w-2.5" />
                                  {imageSlides}
                                </Badge>
                              )}
                              {videoSlides > 0 && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-xs py-0 px-1.5 h-5"
                                >
                                  <Video className="h-2.5 w-2.5" />
                                  {videoSlides}
                                </Badge>
                              )}

                              {/* Action Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  onClick={(e) => e.stopPropagation()}
                                  data-dropdown-menu
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddSlideBefore(topic);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add slide before
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddSlideAfter(topic);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add slide after
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTopic(topic);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete topic
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Add topic button - appears below topic */}
                        <div
                          className="flex items-center justify-center transition-all duration-200 w-full"
                          style={{
                            height: showAddButtonForTopic ? "48px" : "0px",
                            opacity: showAddButtonForTopic ? 1 : 0,
                            marginTop: showAddButtonForTopic ? "8px" : "0px",
                          }}
                          onMouseEnter={() => {
                            if (hideButtonTimeoutRef.current) {
                              clearTimeout(hideButtonTimeoutRef.current);
                              hideButtonTimeoutRef.current = null;
                            }
                            setShowAddButton(index);
                          }}
                          onMouseLeave={() => {
                            if (hideButtonTimeoutRef.current) {
                              clearTimeout(hideButtonTimeoutRef.current);
                            }
                            hideButtonTimeoutRef.current = setTimeout(() => {
                              setShowAddButton(null);
                            }, 200);
                          }}
                        >
                          {showAddButtonForTopic && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddTopicDrawerOpen(true);
                                  }}
                                  className="h-10 w-full rounded-lg bg-background/50 border-2 border-dashed border-muted-foreground/40 shadow-sm flex items-center justify-center hover:bg-background/80 hover:border-muted-foreground/60 transition-all cursor-pointer"
                                >
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add new topic</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Drop zone after topic (only show after last topic) */}
                        {index === displayTopics.length - 1 && (
                          <div
                            data-drop-zone
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggedTopicId) {
                                handleTopicDragOver(e, index);
                              }
                            }}
                            onDrop={handleTopicDrop}
                            onDragLeave={handleTopicDragLeave}
                            className={`
                        flex-shrink-0 transition-all duration-200 ease-out
                        ${showInsertAfter ? "h-20 w-full mt-3" : "h-0 w-0"}
                        ${showInsertAfter ? "opacity-100" : "opacity-0"}
                        ${draggedTopicId ? "cursor-move" : ""}
                      `}
                          >
                            {showInsertAfter && (
                              <div className="w-full h-full border-2 border-dashed border-primary bg-primary/10 rounded-lg flex flex-col items-center justify-center gap-2">
                                <div className="text-sm font-semibold text-primary">
                                  Drop here
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Edit Stage Sheet */}
      <EditStageSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        stage={stage}
        onStageUpdated={handleStageUpdated}
        onStageDeleted={handleStageDeleted}
      />

      {/* Add Topic Drawer */}
      <AddTopicDrawer
        open={isAddTopicDrawerOpen}
        onOpenChange={setIsAddTopicDrawerOpen}
        stageId={stage.id}
        onTopicAdded={handleTopicAdded}
      />
    </div>
  );
}
