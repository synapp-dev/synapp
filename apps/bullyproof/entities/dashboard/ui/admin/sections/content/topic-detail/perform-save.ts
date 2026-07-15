import { toast } from "sonner";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { QuizData } from "@/components/organisms/quiz-slide-editor";

import { slideHasContent } from "./lib";
import type { CertificationTopic, ExtendedSlideData, Topic } from "./types";

// Everything performSave reads/writes in the orchestrator; the wrapper there
// rebuilds this object each render so values are as fresh as the original closure.
export interface PerformSaveDeps {
  topic: Topic | CertificationTopic | null;
  stage: any | null;
  isSaving: boolean;
  isCertification: boolean;
  localSlides: ExtendedSlideData[];
  originalSlides: ExtendedSlideData[];
  deletedSlideIds: Set<string>;
  pendingFileUploads: Map<string, File>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>;
  setSaveProgress: React.Dispatch<React.SetStateAction<number>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<string>>;
  setTopic: React.Dispatch<
    React.SetStateAction<Topic | CertificationTopic | null>
  >;
  setLocalSlides: React.Dispatch<React.SetStateAction<ExtendedSlideData[]>>;
  setOriginalSlides: React.Dispatch<React.SetStateAction<ExtendedSlideData[]>>;
  setPendingFileUploads: React.Dispatch<
    React.SetStateAction<Map<string, File>>
  >;
  setDeletedSlideIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setSlideRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setShowSaveSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingSave: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSaveProgressDialog: React.Dispatch<React.SetStateAction<boolean>>;
  invalidateSlide: (slideId: string) => void;
  invalidateCertificationSlide: (slideId: string) => void;
  fetchTopicData: (skipLoading?: boolean) => Promise<void>;
  refetchTopics: () => Promise<any>;
}

// Actual save function (called after confirmation)
export const performSaveImpl = async (deps: PerformSaveDeps) => {
  const {
    topic,
    stage,
    isSaving,
    isCertification,
    localSlides,
    originalSlides,
    deletedSlideIds,
    pendingFileUploads,
    setIsSaving,
    setUploadError,
    setSaveProgress,
    setSaveStatus,
    setTopic,
    setLocalSlides,
    setOriginalSlides,
    setPendingFileUploads,
    setDeletedSlideIds,
    setHasUnsavedChanges,
    setSlideRefreshKey,
    setShowSaveSuccess,
    setPendingSave,
    setShowSaveProgressDialog,
    invalidateSlide,
    invalidateCertificationSlide,
    fetchTopicData,
    refetchTopics,
  } = deps;

  if (!topic || isSaving) return;
  if (!isCertification && !stage) return;

  setIsSaving(true);
  setUploadError(null);
  setSaveProgress(0);

  // Analyze what operations will be performed
  const hasFileUploads = pendingFileUploads.size > 0;
  const hasCreates = localSlides.some((s) => s.id.startsWith("temp_"));
  const hasUpdates = localSlides.some(
    (s) =>
      !s.id.startsWith("temp_") &&
      !deletedSlideIds.has(s.id) &&
      pendingFileUploads.has(s.id),
  );
  const hasDeletes = deletedSlideIds.size > 0;
  const hasReorder = (() => {
    const originalSorted = [...originalSlides]
      .sort(compareSlidesByPosition)
      .map((s) => s.id)
      .filter((id) => !id.startsWith("temp_"));
    const currentSorted = localSlides
      .filter((s) => !deletedSlideIds.has(s.id))
      .sort(compareSlidesByPosition)
      .map((s) => s.id)
      .filter((id) => !id.startsWith("temp_"));
    return (
      originalSorted.length === currentSorted.length &&
      originalSorted.some((id, idx) => currentSorted[idx] !== id)
    );
  })();

  // Set initial status based on operations
  if (hasFileUploads) {
    setSaveStatus("Uploading files...");
  } else if (hasCreates) {
    setSaveStatus("Creating slides...");
  } else if (hasDeletes) {
    setSaveStatus("Deleting slides...");
  } else if (hasReorder) {
    setSaveStatus("Reordering slides...");
  } else if (hasUpdates) {
    setSaveStatus("Updating slides...");
  } else {
    setSaveStatus("Saving changes...");
  }

  try {
    // Extract stage code/number for file paths
    let topicNumber: number | null | undefined;

    if (isCertification) {
      topicNumber = (topic as CertificationTopic).courseOrder;
    } else {
      // For curriculum, extract stage number from stage.code (e.g., "S1" -> 1)
      const stageNumberMatch = (stage as any).code.match(/^S(\d+)$/);
      if (!stageNumberMatch) {
        throw new Error("Invalid stage code format");
      }
      topicNumber = (topic as Topic).stageOrder;
    }

    if (topicNumber === null || topicNumber === undefined) {
      throw new Error("Topic stageOrder is missing");
    }

    // Step 1: Prepare operations
    const activeSlides = localSlides.filter(
      (s) => !deletedSlideIds.has(s.id),
    );

    // Filter out empty slides (slides without images, videos, quiz data, or text)
    // Also automatically mark empty existing slides for deletion
    console.log("[topic-detail] performSave: Filtering slides before save:", {
      totalActiveSlides: activeSlides.length,
      pendingFileUploads: pendingFileUploads.size,
    });

    const validSlides: typeof activeSlides = [];
    const newDeletedIds = new Set(deletedSlideIds);

    for (const slide of activeSlides) {
      const extendedSlide = slide as ExtendedSlideData;
      const hasImageUrl = !!slide.imageUrl;
      const hasVideoUrl = !!slide.videoUrl;
      const hasQuizData =
        isCertification &&
        extendedSlide.kind === "quiz" &&
        extendedSlide.quizData;
      const hasTextHtml =
        !isCertification && slide.kind === "text" && slide.textHtml;
      const hasPendingUpload = pendingFileUploads.has(slide.id);

      const slideContent = {
        id: slide.id,
        kind: slide.kind,
        hasImageUrl,
        hasVideoUrl,
        hasQuizData: !!hasQuizData,
        hasTextHtml: !!hasTextHtml,
        hasPendingUpload,
        isTemp: slide.id.startsWith("temp_"),
      };

      // Keep slide if it has any content or a pending upload
      if (
        hasImageUrl ||
        hasVideoUrl ||
        hasQuizData ||
        hasTextHtml ||
        hasPendingUpload
      ) {
        validSlides.push(slide);
        console.log(
          "[topic-detail] performSave: Keeping slide with content:",
          slideContent,
        );
      } else {
        // Empty slide - mark for deletion if it's an existing slide (not a temp slide)
        console.warn(
          "[topic-detail] performSave: Found empty slide:",
          slideContent,
        );
        if (!slide.id.startsWith("temp_")) {
          console.log(
            "[topic-detail] performSave: Marking existing empty slide for deletion:",
            slide.id,
          );
          newDeletedIds.add(slide.id);
        } else {
          console.log(
            "[topic-detail] performSave: Skipping temp slide without content (won't be created):",
            slide.id,
          );
        }
        // Temp slides without content are simply not included (they won't be created)
      }
    }

    console.log("[topic-detail] performSave: After filtering:", {
      validSlides: validSlides.length,
      emptySlidesMarkedForDeletion: newDeletedIds.size - deletedSlideIds.size,
      totalToDelete: newDeletedIds.size,
    });

    // Use validSlides order as-is - it reflects the user's drag/reorder.
    // Do NOT sort by position here; position is only updated after save, so sorting
    // would revert to the original server order and undo the user's reorder.
    const slidesInSaveOrder = validSlides;

    // Canonical desired order: all slide IDs (existing + temp) in final order.
    // Backend resolves temp IDs after creates; used to fix jumbling on bulk delete/reorder.
    const desiredOrder = slidesInSaveOrder.map((s) => s.id);

    // Use the updated deleted IDs set (includes empty slides marked for deletion)
    const finalDeletedIds = Array.from(newDeletedIds);

    // Separate slides into creates and updates
    const creates: any[] = [];
    const updates: any[] = [];
    const slideIds: string[] = [];

    for (const slide of slidesInSaveOrder) {
      const extendedSlide = slide as ExtendedSlideData;
      if (slide.id.startsWith("temp_")) {
        // New slide - include tempId so server can map files
        const createData: any = {
          tempId: slide.id, // Include tempId for file mapping
          position: slide.position,
          kind: slide.kind,
          // Don't include imageUrl - server will upload file and set it
          videoUrl: slide.videoUrl || null,
          textHtml: slide.textHtml || null,
          videoStartS: slide.videoStartS || null,
          videoEndS: slide.videoEndS || null,
        };
        // Add quiz data for certification
        if (isCertification && extendedSlide.quizData) {
          createData.quizData = extendedSlide.quizData;
        }
        creates.push(createData);
      } else {
        // Existing slide - check if it has a pending file upload
        const updateData: any = {
          id: slide.id,
          kind: slide.kind,
          // For existing slides, if there's a file upload, we'll handle it separately
          // Otherwise keep existing imageUrl
          imageUrl: pendingFileUploads.has(slide.id)
            ? null
            : slide.imageUrl || null,
          videoUrl: slide.videoUrl || null,
          textHtml: slide.textHtml || null,
          videoStartS: slide.videoStartS || null,
          videoEndS: slide.videoEndS || null,
        };
        // Add quiz data for certification
        if (isCertification) {
          updateData.quizData = extendedSlide.quizData || null;
          // Clear imageUrl and videoUrl for quiz slides (database constraint)
          if (slide.kind === "quiz") {
            updateData.imageUrl = null;
            updateData.videoUrl = null;
            updateData.textHtml = null;
          }
        }
        updates.push(updateData);
        slideIds.push(slide.id);
      }
    }

    // Step 2: Prepare FormData with operations and files
    const formData = new FormData();
    formData.append(
      "operations",
      JSON.stringify({
        topicId: topic.id,
        creates,
        updates,
        deletes: finalDeletedIds,
        reorder: slideIds,
        desiredOrder,
      }),
    );

    // Add files for new slides (keyed by tempId)
    for (const [tempId, file] of pendingFileUploads.entries()) {
      if (tempId.startsWith("temp_")) {
        formData.append(`file_${tempId}`, file);
      }
    }

    // Add files for existing slides (keyed by slideId)
    for (const [slideId, file] of pendingFileUploads.entries()) {
      if (!slideId.startsWith("temp_")) {
        formData.append(`file_${slideId}`, file);
      }
    }

    // Check total payload size and chunk if necessary
    let totalSize = 0;
    const fileCount = pendingFileUploads.size;
    for (const file of pendingFileUploads.values()) {
      totalSize += file.size;
    }
    const sizeInMB = totalSize / (1024 * 1024);
    const operationsJson = JSON.stringify({
      topicId: topic.id,
      creates,
      updates,
      deletes: finalDeletedIds,
      reorder: slideIds,
      desiredOrder,
    });
    const operationsSize = operationsJson.length;
    const totalPayloadSizeMB = (totalSize + operationsSize) / (1024 * 1024);

    console.log("[topic-detail] Upload size check:", {
      fileCount,
      totalSizeMB: sizeInMB.toFixed(2),
      operationsSize,
      totalPayloadSizeMB: totalPayloadSizeMB.toFixed(2),
    });

    // Chunk size limit: 3.5MB to be safe (Vercel limit is ~4.5MB, but we account for FormData overhead)
    const MAX_CHUNK_SIZE_MB = 3.5;
    const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;

    // Helper function to create a chunk
    const createChunk = (
      chunkCreates: typeof creates,
      chunkUpdates: typeof updates,
      chunkDeletes: string[],
      chunkFiles: Map<string, File>,
    ) => {
      const chunkFormData = new FormData();
      chunkFormData.append(
        "operations",
        JSON.stringify({
          topicId: topic.id,
          creates: chunkCreates,
          updates: chunkUpdates,
          deletes: chunkDeletes,
          reorder: [], // We'll handle reorder at the end
        }),
      );

      for (const [key, file] of chunkFiles.entries()) {
        if (key.startsWith("temp_")) {
          chunkFormData.append(`file_${key}`, file);
        } else {
          chunkFormData.append(`file_${key}`, file);
        }
      }

      return chunkFormData;
    };

    // Helper function to estimate chunk size
    const estimateChunkSize = (
      chunkCreates: typeof creates,
      chunkUpdates: typeof updates,
      chunkFiles: Map<string, File>,
    ): number => {
      let size = JSON.stringify({
        topicId: topic.id,
        creates: chunkCreates,
        updates: chunkUpdates,
        deletes: [],
        reorder: [],
      }).length;

      for (const file of chunkFiles.values()) {
        size += file.size;
      }

      return size;
    };

    // Check if we need to chunk
    if (totalPayloadSizeMB <= MAX_CHUNK_SIZE_MB) {
      // Single request - no chunking needed
      console.log("[topic-detail] Payload size OK, sending single request");

      // Update progress: files prepared
      setSaveProgress(hasFileUploads ? 20 : 40);

      // Step 3: Call bulk save API with FormData
      if (hasFileUploads) {
        setSaveStatus("Uploading files...");
      } else {
        setSaveStatus("Processing changes...");
      }

      var result = isCertification
        ? await certificationApi.topics.slides.bulkSave(topic.id, formData)
        : await topicsApi.slides.bulkSave(formData);

      if (result.error) {
        throw new Error(result.error.message || "Failed to save changes");
      }
    } else {
      // Need to chunk - split into multiple requests
      console.log(
        `[topic-detail] Payload too large (${totalPayloadSizeMB.toFixed(2)} MB), chunking into smaller batches...`,
      );

      const chunks: Array<{
        creates: typeof creates;
        updates: typeof updates;
        deletes: string[];
        files: Map<string, File>;
      }> = [];

      // Strategy: Process deletes first (no files), then chunk creates/updates with their files
      // Step 1: Handle all deletes in first chunk (if any)
      if (finalDeletedIds.length > 0) {
        chunks.push({
          creates: [],
          updates: [],
          deletes: [...finalDeletedIds],
          files: new Map(),
        });
      }

      // Step 2: Chunk creates with their files
      let currentChunkCreates: typeof creates = [];
      let currentChunkFiles = new Map<string, File>();
      let currentChunkSize = 0;

      for (const create of creates) {
        const tempId = create.tempId;
        const file = tempId ? pendingFileUploads.get(tempId) : undefined;
        const fileSize = file ? file.size : 0;
        const createSize = JSON.stringify(create).length;
        const estimatedSize = currentChunkSize + createSize + fileSize;

        // If adding this create would exceed the limit, start a new chunk
        if (
          currentChunkCreates.length > 0 &&
          estimatedSize > MAX_CHUNK_SIZE_BYTES
        ) {
          chunks.push({
            creates: currentChunkCreates,
            updates: [],
            deletes: [],
            files: new Map(currentChunkFiles),
          });
          currentChunkCreates = [];
          currentChunkFiles = new Map();
          currentChunkSize = 0;
        }

        currentChunkCreates.push(create);
        if (file && tempId) {
          currentChunkFiles.set(tempId, file);
        }
        currentChunkSize += createSize + fileSize;
      }

      // Add remaining creates chunk
      if (currentChunkCreates.length > 0) {
        chunks.push({
          creates: currentChunkCreates,
          updates: [],
          deletes: [],
          files: new Map(currentChunkFiles),
        });
      }

      // Step 3: Chunk updates with their files
      let currentChunkUpdates: typeof updates = [];
      currentChunkFiles = new Map();
      currentChunkSize = 0;

      for (const update of updates) {
        const file = pendingFileUploads.get(update.id);
        const fileSize = file ? file.size : 0;
        const updateSize = JSON.stringify(update).length;
        const estimatedSize = currentChunkSize + updateSize + fileSize;

        // If adding this update would exceed the limit, start a new chunk
        if (
          currentChunkUpdates.length > 0 &&
          estimatedSize > MAX_CHUNK_SIZE_BYTES
        ) {
          chunks.push({
            creates: [],
            updates: currentChunkUpdates,
            deletes: [],
            files: new Map(currentChunkFiles),
          });
          currentChunkUpdates = [];
          currentChunkFiles = new Map();
          currentChunkSize = 0;
        }

        currentChunkUpdates.push(update);
        if (file) {
          currentChunkFiles.set(update.id, file);
        }
        currentChunkSize += updateSize + fileSize;
      }

      // Add remaining updates chunk
      if (currentChunkUpdates.length > 0) {
        chunks.push({
          creates: [],
          updates: currentChunkUpdates,
          deletes: [],
          files: new Map(currentChunkFiles),
        });
      }

      console.log(
        `[topic-detail] Split into ${chunks.length} chunks:`,
        chunks.map((c, i) => ({
          chunk: i + 1,
          creates: c.creates.length,
          updates: c.updates.length,
          deletes: c.deletes.length,
          files: c.files.size,
          estimatedSizeMB: (
            estimateChunkSize(c.creates, c.updates, c.files) /
            (1024 * 1024)
          ).toFixed(2),
        })),
      );

      // Process chunks sequentially; accumulate tempId->realId for desiredOrder resolution
      let lastResult: any = null;
      const tempToRealMap = new Map<string, string>();
      const totalChunks = chunks.length;
      const progressPerChunk = hasFileUploads
        ? 60 / totalChunks
        : 80 / totalChunks;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNum = i + 1;

        console.log(
          `[topic-detail] Processing chunk ${chunkNum}/${totalChunks}...`,
        );

        setSaveStatus(`Processing batch ${chunkNum} of ${totalChunks}...`);
        setSaveProgress(20 + progressPerChunk * i);

        const chunkFormData = createChunk(
          chunk.creates,
          chunk.updates,
          chunk.deletes,
          chunk.files,
        );

        const chunkResult = isCertification
          ? await certificationApi.topics.slides.bulkSave(
              topic.id,
              chunkFormData,
            )
          : await topicsApi.slides.bulkSave(chunkFormData);

        if (chunkResult.error) {
          throw new Error(
            chunkResult.error.message ||
              `Failed to save chunk ${chunkNum} of ${totalChunks}`,
          );
        }

        lastResult = chunkResult;

        // Accumulate tempId->realId from response for desiredOrder resolution
        const mapping = (
          chunkResult.data as { createdSlideMapping?: Record<string, string> }
        )?.createdSlideMapping;
        if (mapping) {
          Object.entries(mapping).forEach(([tempId, realId]) =>
            tempToRealMap.set(tempId, realId),
          );
        }
      }

      // Step 4: Final reorder using desiredOrder with resolved temp IDs
      const resolvedOrder = desiredOrder
        .map((id) => tempToRealMap.get(id) ?? id)
        .filter((id) => !finalDeletedIds.includes(id));

      if (resolvedOrder.length > 0) {
        console.log("[topic-detail] Performing final reorder...");
        setSaveStatus("Reordering slides...");
        setSaveProgress(hasFileUploads ? 85 : 90);

        const reorderFormData = new FormData();
        reorderFormData.append(
          "operations",
          JSON.stringify({
            topicId: topic.id,
            creates: [],
            updates: [],
            deletes: [],
            reorder: slideIds,
            desiredOrder: resolvedOrder,
          }),
        );

        const reorderResult = isCertification
          ? await certificationApi.topics.slides.bulkSave(
              topic.id,
              reorderFormData,
            )
          : await topicsApi.slides.bulkSave(reorderFormData);

        if (reorderResult.error) {
          throw new Error(
            reorderResult.error.message || "Failed to reorder slides",
          );
        }

        lastResult = reorderResult;
      }

      // Use the last result for processing (will continue to response handling below)
      result = lastResult;
    }

    // Both single and chunked requests end up here with result set
    if (result.error) {
      throw new Error(result.error.message || "Failed to save changes");
    }

    // Update progress: processing response
    setSaveProgress(hasFileUploads ? 70 : 85);
    setSaveStatus("Processing response...");

    // Step 4: Update local state with server response
    let updatedSlides: ExtendedSlideData[] = [];

    if (result.data) {
      // Update topic if it's included in the response, otherwise keep existing topic
      // Merge response topic with existing topic to preserve fields like title
      if ("topic" in result.data && result.data.topic) {
        // If the response topic has all necessary fields, use it
        // Otherwise, merge it with the existing topic to preserve fields like title
        const responseTopic = result.data.topic;
        if (topic && (!responseTopic.title || !responseTopic.stageOrder)) {
          // Merge: keep existing topic fields, update with response fields (especially slides)
          setTopic({
            ...topic,
            ...responseTopic,
            slides: responseTopic.slides || topic.slides,
          });
        } else {
          // Response has full topic data, use it directly
          setTopic(responseTopic);
        }
      }

      // Update slides from response if available
      // Always use the response topic if available, don't fall back to existing topic
      // as it may have stale data
      const responseTopic =
        "topic" in result.data && result.data.topic
          ? result.data.topic
          : null;

      if (responseTopic?.slides && responseTopic.slides.length > 0) {
        // Create a map of slide IDs that had pending uploads
        const slidesWithUploads = new Set(pendingFileUploads.keys());
        // Create a set of deleted slide IDs for filtering
        const deletedIdsSet = new Set(deletedSlideIds);

        updatedSlides =
          responseTopic.slides
            ?.filter((slide: any) => !deletedIdsSet.has(slide.id)) // Filter out any deleted slides that might still be in response
            ?.filter((slide: any) => slideHasContent(slide, isCertification)) // Filter out ghost/empty slides
            ?.sort(compareSlidesByPosition)
            .map((slide: any) => {
              // If this slide had a pending upload, ensure we use the server's imageUrl
              // If the server didn't return an imageUrl but we had an upload, log a warning
              const hadUpload = slidesWithUploads.has(slide.id);
              if (hadUpload && !slide.imageUrl) {
                console.error(
                  `Slide ${slide.id} had a file upload but server response doesn't include imageUrl. Server slide data:`,
                  slide,
                );
              }

              // Ensure we're not using blob URLs - only use server URLs
              const imageUrl =
                slide.imageUrl && slide.imageUrl.startsWith("blob:")
                  ? null
                  : (slide.imageUrl ?? null);

              const imageSigned =
                slide.signedUrl ?? slide.signedImageUrl ?? null;
              return {
                id: slide.id,
                kind: slide.kind as
                  | "text"
                  | "image"
                  | "video"
                  | "quiz"
                  | "test",
                position: slide.position,
                textHtml: slide.textHtml ?? null,
                // Use server's imageUrl - it should have the uploaded file URL
                // Never use blob URLs from the response
                imageUrl,
                videoUrl: slide.videoUrl ?? null,
                videoStartS: slide.videoStartS ?? null,
                videoEndS: slide.videoEndS ?? null,
                effectiveNotes: slide.officialNotes ?? null,
                quizData: isCertification
                  ? (slide.quizData as QuizData | null)
                  : null,
                signedUrl: imageSigned,
                signedImageUrl: slide.signedImageUrl ?? null,
                signedVideoUrl: slide.signedVideoUrl ?? null,
              };
            }) ?? [];
        setLocalSlides(updatedSlides);
      } else {
        // If response doesn't have slides, but we had uploads, this is an error
        if (pendingFileUploads.size > 0) {
          console.error(
            "Server response doesn't include slides but we had file uploads. Response:",
            result.data,
          );
          // Don't update localSlides - keep the current state with blobUrls for now
          // The user can try saving again
        } else if (responseTopic) {
          // No slides in response but no uploads - set empty array
          setLocalSlides([]);
          setOriginalSlides([]);
        }
      }

      // Batch invalidate cache for slides that had files uploaded
      const slideIdsToInvalidate = new Set<string>();

      // For existing slides with file uploads
      for (const slideId of Array.from(pendingFileUploads.keys())) {
        if (!slideId.startsWith("temp_")) {
          slideIdsToInvalidate.add(slideId);
        }
      }

      // For newly created slides, invalidate by matching tempId/position
      if (
        result.data &&
        "topic" in result.data &&
        result.data.topic?.slides
      ) {
        const tempSlidesWithFiles = localSlides.filter(
          (s) => s.id.startsWith("temp_") && pendingFileUploads.has(s.id),
        );
        for (const tempSlide of tempSlidesWithFiles) {
          const createdSlide = result.data.topic.slides.find(
            (s: any) =>
              s.id === tempSlide.id || s.position === tempSlide.position,
          );
          if (createdSlide) {
            slideIdsToInvalidate.add(createdSlide.id);
          }
        }
      }

      // Batch invalidate all slides with uploads at once
      slideIdsToInvalidate.forEach((slideId) => {
        if (isCertification) {
          invalidateCertificationSlide(slideId);
        } else {
          invalidateSlide(slideId);
        }
      });

      // Clear pending changes and update original slides to match saved state
      setPendingFileUploads(new Map());
      setDeletedSlideIds(new Set());
      setHasUnsavedChanges(false);
      // Update originalSlides to match the saved state so future change calculations are correct
      setOriginalSlides(JSON.parse(JSON.stringify(updatedSlides)));
      setSlideRefreshKey((prev) => prev + 1);

      // Invalidate all slide caches for slides that were updated/created
      // This ensures the cache store will refetch fresh URLs
      const allSlideIds = new Set<string>();
      if (updatedSlides.length > 0) {
        updatedSlides.forEach((slide) => allSlideIds.add(slide.id));
      }
      // Also include slides from the response topic if available
      if (responseTopic?.slides) {
        responseTopic.slides.forEach((slide: any) =>
          allSlideIds.add(slide.id),
        );
      }

      // Batch invalidate caches for all slides
      allSlideIds.forEach((slideId) => {
        if (isCertification) {
          invalidateCertificationSlide(slideId);
        } else {
          invalidateSlide(slideId);
        }
      });

      // Update progress: finalizing changes
      setSaveProgress(90);
      setSaveStatus("Finalising changes...");

      // Refetch when: (1) response lacks slides, or (2) we had deletes – ensures server state is authoritative
      const needsRefetch =
        !responseTopic ||
        !responseTopic.slides ||
        responseTopic.slides.length === 0 ||
        deletedSlideIds.size > 0;

      if (needsRefetch) {
        if (isCertification) {
          await fetchTopicData(true);
        } else {
          await refetchTopics();
        }
      }

      // Complete progress
      setSaveProgress(100);
      setSaveStatus("Changes saved successfully!");

      // Show success feedback on button
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000); // Show for 2 seconds

      // Show success toast
      toast.success("Changes saved successfully", {
        position: "bottom-right",
      });
    }
  } catch (err) {
    console.error("Bulk save error:", err);

    // Check for payload size errors
    let errorMessage = "Failed to save changes";
    if (err instanceof Error) {
      const errMsg = err.message.toLowerCase();
      if (
        errMsg.includes("too large") ||
        errMsg.includes("payload") ||
        errMsg.includes("413") ||
        errMsg.includes("request entity too large") ||
        errMsg.includes("function_payload_too_large")
      ) {
        errorMessage =
          "Upload too large. Please try compressing your images before uploading, or upload in smaller batches.";
      } else if (
        errMsg.includes("formdata") ||
        errMsg.includes("failed to parse")
      ) {
        errorMessage =
          "Failed to process upload. The request may be too large or corrupted. Please try uploading fewer slides at once.";
      } else {
        errorMessage = err.message;
      }
    }

    setUploadError(errorMessage);
    setSaveProgress(0);
    setSaveStatus("Upload failed");
    toast.error(errorMessage, {
      position: "bottom-right",
      duration: 5000, // Show for longer so user can read it
    });
  } finally {
    setIsSaving(false);
    setPendingSave(false);
    // Reset progress after a short delay to allow user to see completion
    setTimeout(() => {
      setSaveProgress(0);
      setSaveStatus("");
      setShowSaveProgressDialog(false);
    }, 500);
  }
};
