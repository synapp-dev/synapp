"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSessionLibraryStore } from "@/stores/session-library-store";
import { convertPdfToImages } from "@/utils/pdf-converter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Folder,
  ChevronRight,
  Youtube,
  Check,
  Images,
  SquareLibrary,
  X,
  FileQuestion,
} from "lucide-react";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { VideoDialog } from "./video-dialog";

interface ImageSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageData: Blob, blobUrl: string) => void;
  onSelectMultipleImages?: (
    images: Array<{ imageData: Blob; blobUrl: string }>
  ) => void;
  onAddVideo?: (videoUrl: string) => void;
  onAddQuiz?: () => void;
  allowMultipleSelection?: boolean;
}

interface UploadCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  accept?: string;
  multiple?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function UploadCard({
  icon: Icon,
  title,
  description,
  onClick,
  isLoading = false,
  loadingText,
  disabled = false,
  inputRef,
  accept,
  multiple = false,
  onChange,
}: UploadCardProps) {
  return (
    <Card
      className={`border-2 border-dashed border-muted-foreground/30 transition-all overflow-hidden ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary hover:bg-primary/5 hover:shadow-md"
      }`}
    >
      {inputRef && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
        />
      )}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center gap-1 p-0"
        onClick={disabled ? undefined : onClick}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-center">
              {loadingText || "Loading..."}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0">
            <div className="flex flex-col items-center justify-center gap-1">
              <Icon className="h-12 w-12 text-primary" />
              <p className="text-lg font-semibold text-center">{title}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {description}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface FolderCardProps {
  group: {
    pdfId: string;
    pdfName: string;
    pages: Array<{
      id: string;
      blobUrl: string;
      pageNumber: number;
    }>;
  };
  onClick: () => void;
}

function FolderCard({ group, onClick }: FolderCardProps) {
  const sortedPages = [...group.pages].sort(
    (a, b) => a.pageNumber - b.pageNumber
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (sortedPages.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % sortedPages.length);
        setIsTransitioning(false);
      }, 600); // Match transition duration
    }, 1500); // Change every 1.5 seconds (slide sits for ~0.9s, transitions for 0.6s)

    return () => clearInterval(interval);
  }, [sortedPages.length]);

  const currentPage = sortedPages[currentIndex];
  const nextIndex = (currentIndex + 1) % sortedPages.length;
  const nextPage = sortedPages[nextIndex];

  return (
    <Card
      className="relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail in aspect-video */}
      <div className="relative w-full aspect-video overflow-hidden bg-muted">
        {currentPage ? (
          <>
            {/* Current image - slides up and out when transitioning */}
            <div
              key={`current-${currentPage.id}`}
              className={`absolute inset-0 transition-transform duration-[600ms] ease-in-out ${
                isTransitioning ? "-translate-y-full" : "translate-y-0"
              }`}
            >
              <Image
                src={currentPage.blobUrl}
                alt={`${group.pdfName} - Page ${currentPage.pageNumber}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
            {/* Next image - slides up from bottom, always rendered but positioned below when not transitioning */}
            {nextPage && (
              <div
                key={`next-${nextPage.id}`}
                className={`absolute inset-0 transition-transform duration-[600ms] ease-in-out ${
                  isTransitioning ? "translate-y-0" : "translate-y-full"
                }`}
              >
                <Image
                  src={nextPage.blobUrl}
                  alt={`${group.pdfName} - Page ${nextPage.pageNumber}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Footer with folder name and slide count */}
      <div className="w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 bg-muted text-primary">
        <div className="flex items-center gap-2 min-w-0">
          <Folder className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{group.pdfName}</span>
        </div>
        <span className="flex-shrink-0">
          {group.pages.length} {group.pages.length === 1 ? "slide" : "slides"}
        </span>
      </div>
    </Card>
  );
}

export function ImageSelectorDialog({
  open,
  onOpenChange,
  onSelectImage,
  onSelectMultipleImages,
  onAddVideo,
  onAddQuiz,
  allowMultipleSelection = false,
}: ImageSelectorDialogProps) {
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processingPdfNames, setProcessingPdfNames] = useState<Set<string>>(
    new Set()
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentPdfFolder, setCurrentPdfFolder] = useState<string | null>(null); // null = main library, string = PDF ID
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<{
    blob: Blob;
    blobUrl: string;
  } | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    new Set()
  );
  const [hoveredAfterSelection, setHoveredAfterSelection] = useState<
    Set<string>
  >(new Set());
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [footerMessage, setFooterMessage] = useState<{
    type: "success" | "error";
    description: string;
  } | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const footerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { pdfPages, singleImages, addPdfPages, addSingleImage, getAllItems } =
    useSessionLibraryStore();

  // Helper function to show footer message
  const showFooterMessage = (
    type: "success" | "error",
    description: string
  ) => {
    // Clear existing timeout
    if (footerTimeoutRef.current) {
      clearTimeout(footerTimeoutRef.current);
    }

    // Set new message
    setFooterMessage({ type, description });

    // Auto-hide after 3 seconds
    footerTimeoutRef.current = setTimeout(() => {
      setFooterMessage(null);
      footerTimeoutRef.current = null;
    }, 3000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (footerTimeoutRef.current) {
        clearTimeout(footerTimeoutRef.current);
      }
    };
  }, []);

  // Group PDF pages by PDF ID
  const pdfGroups = pdfPages.reduce(
    (acc, page) => {
      if (!page.pdfId) return acc;
      if (!acc[page.pdfId]) {
        acc[page.pdfId] = {
          pdfId: page.pdfId,
          pdfName: page.pdfName || "Untitled PDF",
          pages: [],
        };
      }
      acc[page.pdfId].pages.push(page);
      return acc;
    },
    {} as Record<
      string,
      { pdfId: string; pdfName: string; pages: typeof pdfPages }
    >
  );

  const handlePdfUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const pdfFiles = fileArray.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      showFooterMessage("error", "Please select PDF files");
      return;
    }

    setIsProcessingPdf(true);
    const pdfNames = new Set(
      pdfFiles.map((file) => file.name.replace(/\.pdf$/i, ""))
    );
    setProcessingPdfNames(pdfNames);

    let successCount = 0;
    let totalPages = 0;
    let errorCount = 0;

    // Process PDFs sequentially
    for (const file of pdfFiles) {
      const pdfName = file.name.replace(/\.pdf$/i, "");
      try {
        const pages = await convertPdfToImages(file);
        if (pages.length === 0) {
          errorCount++;
          continue;
        }

        // Generate unique PDF ID
        const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add pages to session library
        addPdfPages(pages, pdfName, pdfId);

        successCount++;
        totalPages += pages.length;

        // Remove from processing set
        setProcessingPdfNames((prev) => {
          const newSet = new Set(prev);
          newSet.delete(pdfName);
          return newSet;
        });
      } catch (error) {
        console.error(`Error processing PDF ${pdfName}:`, error);
        errorCount++;
        setProcessingPdfNames((prev) => {
          const newSet = new Set(prev);
          newSet.delete(pdfName);
          return newSet;
        });
      }
    }

    // Show summary message
    if (successCount > 0) {
      showFooterMessage(
        "success",
        `${successCount} PDF${successCount !== 1 ? "s" : ""} converted: ${totalPages} pages added to library`
      );
    }
    if (errorCount > 0) {
      showFooterMessage(
        "error",
        `${errorCount} PDF${errorCount !== 1 ? "s" : ""} failed to process`
      );
    }

    setIsProcessingPdf(false);
    setProcessingPdfNames(new Set());
    if (pdfFileInputRef.current) {
      pdfFileInputRef.current.value = "";
    }
  };

  const handleSingleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showFooterMessage("error", "Please select an image file");
      return;
    }

    setIsUploadingImage(true);
    try {
      addSingleImage(file);
      showFooterMessage("success", "Image added to library");
    } catch (error) {
      console.error("Error uploading image:", error);
      showFooterMessage("error", "Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    }
  };

  const handleImageClick = (
    imageData: Blob,
    blobUrl: string,
    imageId: string
  ) => {
    if (allowMultipleSelection) {
      setSelectedImageIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
          // Remove from hovered set when deselected
          setHoveredAfterSelection((prevHover) => {
            const newHoverSet = new Set(prevHover);
            newHoverSet.delete(imageId);
            return newHoverSet;
          });
        } else {
          newSet.add(imageId);
          // Remove from hovered set when newly selected
          setHoveredAfterSelection((prevHover) => {
            const newHoverSet = new Set(prevHover);
            newHoverSet.delete(imageId);
            return newHoverSet;
          });
        }
        return newSet;
      });
    } else {
      setSelectedImageId(imageId);
      setSelectedImageData({ blob: imageData, blobUrl });
      // Remove from hovered set when newly selected
      setHoveredAfterSelection((prevHover) => {
        const newHoverSet = new Set(prevHover);
        newHoverSet.delete(imageId);
        return newHoverSet;
      });
    }
  };

  const handleCardMouseEnter = (imageId: string, isSelected: boolean) => {
    if (isSelected) {
      setHoveredAfterSelection((prev) => {
        const newSet = new Set(prev);
        newSet.add(imageId);
        return newSet;
      });
    }
  };

  const handleConfirmSelection = () => {
    if (allowMultipleSelection && onSelectMultipleImages) {
      // Collect all selected images
      const selectedImages: Array<{ imageData: Blob; blobUrl: string }> = [];

      // Get selected PDF pages
      pdfPages.forEach((page) => {
        if (selectedImageIds.has(page.id)) {
          selectedImages.push({
            imageData: page.imageData,
            blobUrl: page.blobUrl,
          });
        }
      });

      // Get selected single images
      singleImages.forEach((image) => {
        if (selectedImageIds.has(image.id)) {
          selectedImages.push({
            imageData: image.imageData,
            blobUrl: image.blobUrl,
          });
        }
      });

      if (selectedImages.length > 0) {
        onSelectMultipleImages(selectedImages);
        onOpenChange(false);
        // Reset selection state
        setSelectedImageIds(new Set());
        setHoveredAfterSelection(new Set());
      }
    } else if (selectedImageData) {
      onSelectImage(selectedImageData.blob, selectedImageData.blobUrl);
      onOpenChange(false);
      // Reset selection state
      setSelectedImageId(null);
      setSelectedImageData(null);
      setHoveredAfterSelection(new Set());
    }
  };

  const handleCancelSelection = () => {
    setSelectedImageId(null);
    setSelectedImageData(null);
    setSelectedImageIds(new Set());
    setHoveredAfterSelection(new Set());
  };

  const handleFolderClick = (pdfId: string) => {
    setCurrentPdfFolder(pdfId);
    // Clear selection when navigating
    setSelectedImageId(null);
    setSelectedImageData(null);
    setSelectedImageIds(new Set());
    setHoveredAfterSelection(new Set());
  };

  const handleBackToLibrary = () => {
    setCurrentPdfFolder(null);
    // Clear selection when navigating
    setSelectedImageId(null);
    setSelectedImageData(null);
    setSelectedImageIds(new Set());
    setHoveredAfterSelection(new Set());
  };

  const handleSelectAllPdfPages = () => {
    if (!currentPdfFolder) return;
    
    const currentGroup = pdfGroups[currentPdfFolder];
    if (!currentGroup) return;

    // Get all page IDs from current PDF, sorted by pageNumber
    const sortedPages = [...currentGroup.pages].sort(
      (a, b) => a.pageNumber - b.pageNumber
    );
    const allPageIds = new Set(sortedPages.map((page) => page.id));

    // Check if all pages are currently selected
    const allSelected = sortedPages.every((page) =>
      selectedImageIds.has(page.id)
    );

    setSelectedImageIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all pages from this PDF
        allPageIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all pages from this PDF in order
        allPageIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });

    // Clear hovered state for pages that are no longer selected
    if (allSelected) {
      setHoveredAfterSelection((prev) => {
        const newSet = new Set(prev);
        allPageIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Reset selection and folder view when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedImageId(null);
      setSelectedImageData(null);
      setSelectedImageIds(new Set());
      setHoveredAfterSelection(new Set());
      setCurrentPdfFolder(null); // Reset to main library view
    }
    onOpenChange(open);
  };

  const isProcessing = isUploadingImage;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="!min-w-[50vw] !w-[50vw] !min-h-[80vh] !h-[80vh] max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Loading overlay - disables interaction when uploading/processing */}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  {isUploadingImage
                    ? "Uploading image..."
                    : `Processing ${processingPdfNames.size} PDF${processingPdfNames.size !== 1 ? "s" : ""}...`}
                </p>
              </div>
            </div>
          )}
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              {allowMultipleSelection ? "Select Slides" : "Replace Image"}
            </DialogTitle>
            {currentPdfFolder ? (
              (() => {
                const currentGroup = pdfGroups[currentPdfFolder];
                if (!currentGroup) return null;
                return (
                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleBackToLibrary}
                      className="gap-2 flex-shrink-0"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      Back to Library
                    </Button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className="h-5 w-5 flex-shrink-0" />
                      <h2 className="text-lg font-semibold truncate">
                        {currentGroup.pdfName}
                      </h2>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        ({currentGroup.pages.length} pages)
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <DialogDescription>
                {allowMultipleSelection
                  ? "Choose one or more images from your library or upload a new PDF. Selected images will be inserted as new slides."
                  : "Choose an image from your library or upload a new one."}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Content Area */}
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isUploadingImage ? "pointer-events-none" : ""}`}
          >
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                {/* Show folder contents if inside a folder */}
                {currentPdfFolder ? (
                  (() => {
                    const currentGroup = pdfGroups[currentPdfFolder];
                    if (!currentGroup) return null;

                    // Calculate checkbox state for select all
                    const sortedPages = [...currentGroup.pages].sort(
                      (a, b) => a.pageNumber - b.pageNumber
                    );
                    const selectedCount = sortedPages.filter((page) =>
                      selectedImageIds.has(page.id)
                    ).length;
                    const allSelected = selectedCount === sortedPages.length;
                    const someSelected = selectedCount > 0 && selectedCount < sortedPages.length;

                    return (
                      <div className="space-y-4">
                        {/* Select All Checkbox - Only show when allowMultipleSelection is true */}
                        {allowMultipleSelection && (
                          <div className="flex items-center gap-3 pb-2 border-b">
                            <Checkbox
                              checked={
                                allSelected
                                  ? true
                                  : someSelected
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={handleSelectAllPdfPages}
                              className="h-5 w-5"
                            />
                            <label
                              onClick={handleSelectAllPdfPages}
                              className="text-sm font-medium cursor-pointer select-none"
                            >
                              {allSelected
                                ? "Deselect All"
                                : someSelected
                                  ? `Select All (${selectedCount} of ${sortedPages.length} selected)`
                                  : "Select All"}
                            </label>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {sortedPages.map((page) => {
                              const isSelected = allowMultipleSelection
                                ? selectedImageIds.has(page.id)
                                : selectedImageId === page.id;
                              const hasHoveredAfterSelection =
                                hoveredAfterSelection.has(page.id);
                              return (
                                <Card
                                  key={page.id}
                                  className={`group relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col ${
                                    isSelected
                                      ? "ring-2 ring-[var(--brand-bullyproof-primary)]"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleImageClick(
                                      page.imageData,
                                      page.blobUrl,
                                      page.id
                                    )
                                  }
                                  onMouseEnter={() =>
                                    handleCardMouseEnter(page.id, isSelected)
                                  }
                                >
                                  {/* Thumbnail in aspect-video */}
                                  <div className="relative w-full aspect-video overflow-hidden bg-muted">
                                    <Image
                                      src={page.blobUrl}
                                      alt={`Page ${page.pageNumber}`}
                                      fill
                                      className="object-contain"
                                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />
                                    {/* Pulsing overlay when selected */}
                                    {isSelected && (
                                      <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
                                    )}
                                    {/* Select/Deselect slide badge - appears in center on hover */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                      <div className="animate-slide-down-fade-in">
                                        {isSelected &&
                                        hasHoveredAfterSelection ? (
                                          <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-primary">
                                            <span className="text-xs font-medium">
                                              Deselect
                                            </span>
                                          </Badge>
                                        ) : !isSelected ? (
                                          <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-bullyproof-primary)] text-secondary">
                                            <span className="text-xs font-medium">
                                              Select slide?
                                            </span>
                                          </Badge>
                                        ) : null}
                                      </div>
                                    </div>
                                    {/* Click handler for selection */}
                                    {allowMultipleSelection && (
                                      <div
                                        className="absolute inset-0 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleImageClick(
                                            page.imageData,
                                            page.blobUrl,
                                            page.id
                                          );
                                        }}
                                      />
                                    )}
                                  </div>
                                  {/* Bottom footer - shows "Selected" when selected */}
                                  <div
                                    className={`w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 transition-all ${
                                      isSelected
                                        ? "bg-[var(--brand-bullyproof-primary)] text-secondary"
                                        : "bg-muted text-primary"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <div className="flex items-center gap-1.5 animate-slide-right-fade-in">
                                        <Check className="h-3 w-3" />
                                        <span>Selected</span>
                                      </div>
                                    ) : (
                                      <div></div>
                                    )}
                                    <span>Page {page.pageNumber}</span>
                                  </div>
                                </Card>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-4">
                    {/* Upload Cards - Always show first */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Upload Single Image Card */}
                      <UploadCard
                        icon={ImageIcon}
                        title="Upload Single Image"
                        description="Add to library"
                        onClick={() => imageFileInputRef.current?.click()}
                        isLoading={isUploadingImage}
                        loadingText="Uploading image..."
                        disabled={isProcessingPdf}
                        inputRef={imageFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleSingleImageUpload(file);
                          }
                        }}
                      />

                      {/* Upload PDF Card */}
                      <UploadCard
                        icon={FileText}
                        title="Upload PDF"
                        description="Creates folder with pages"
                        onClick={() => pdfFileInputRef.current?.click()}
                        disabled={isProcessingPdf}
                        inputRef={pdfFileInputRef}
                        accept="application/pdf"
                        multiple={true}
                        onChange={(e) => {
                          handlePdfUpload(e.target.files);
                        }}
                      />

                      {/* Add Video Card */}
                      {onAddVideo && (
                        <UploadCard
                          icon={Youtube}
                          title="Add Video"
                          description="Link to a YouTube or Vimeo URL"
                          onClick={() => setShowYouTubeDialog(true)}
                          disabled={isProcessingPdf}
                        />
                      )}

                      {/* Add Quiz Card - Only show for certification */}
                      {onAddQuiz && (
                        <UploadCard
                          icon={FileQuestion}
                          title="Add Quiz"
                          description="Create a new quiz slide"
                          onClick={() => {
                            onAddQuiz();
                            onOpenChange(false);
                          }}
                          disabled={isProcessingPdf}
                        />
                      )}

                      {/* Processing PDF Skeletons */}
                      {Array.from(processingPdfNames).map((pdfName) => (
                        <Card
                          key={pdfName}
                          className="relative cursor-not-allowed p-0 overflow-hidden gap-0 flex flex-col opacity-60"
                        >
                          {/* Thumbnail in aspect-video */}
                          <div className="relative w-full aspect-video overflow-hidden bg-muted flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                          {/* Footer with folder name and processing state */}
                          <div className="w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 bg-muted text-primary">
                            <div className="flex items-center gap-2 min-w-0">
                              <Folder className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{pdfName}</span>
                            </div>
                            <span className="flex-shrink-0">Processing...</span>
                          </div>
                        </Card>
                      ))}

                      {/* PDF Folders */}
                      {Object.values(pdfGroups).map((group) => (
                        <FolderCard
                          key={group.pdfId}
                          group={group}
                          onClick={() => handleFolderClick(group.pdfId)}
                        />
                      ))}

                      {/* Single Images */}
                      {singleImages.map((image) => {
                        const isSelected = allowMultipleSelection
                          ? selectedImageIds.has(image.id)
                          : selectedImageId === image.id;
                        const hasHoveredAfterSelection =
                          hoveredAfterSelection.has(image.id);
                        return (
                          <Card
                            key={image.id}
                            className={`group relative cursor-pointer transition-all hover:shadow-md p-0 overflow-hidden flex flex-col ${
                              isSelected
                                ? "ring-2 ring-[var(--brand-bullyproof-primary)]"
                                : ""
                            }`}
                            onClick={() =>
                              handleImageClick(
                                image.imageData,
                                image.blobUrl,
                                image.id
                              )
                            }
                            onMouseEnter={() =>
                              handleCardMouseEnter(image.id, isSelected)
                            }
                          >
                            <div className="relative w-full aspect-video overflow-hidden bg-muted">
                              <Image
                                src={image.blobUrl}
                                alt={image.name}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              />
                              {/* Pulsing overlay when selected */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-secondary/60 animate-pulse" />
                              )}
                              {/* Select/Deselect slide badge - appears in center on hover */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                <div className="animate-slide-down-fade-in">
                                  {isSelected && hasHoveredAfterSelection ? (
                                    <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-primary">
                                      <span className="text-xs font-medium">
                                        Deselect
                                      </span>
                                    </Badge>
                                  ) : !isSelected ? (
                                    <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-bullyproof-primary)] text-secondary">
                                      <span className="text-xs font-medium">
                                        Select slide?
                                      </span>
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                              {/* Click handler for selection */}
                              {allowMultipleSelection && (
                                <div
                                  className="absolute inset-0 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageClick(
                                      image.imageData,
                                      image.blobUrl,
                                      image.id
                                    );
                                  }}
                                />
                              )}
                            </div>
                            {/* Bottom footer - shows "Selected" when selected */}
                            <div
                              className={`w-full text-xs font-medium px-4 py-2 flex items-center justify-start flex-shrink-0 transition-all ${
                                isSelected
                                  ? "bg-[var(--brand-bullyproof-primary)] text-secondary"
                                  : "bg-muted text-secondary"
                              }`}
                            >
                              {isSelected && (
                                <div className="flex items-center gap-1.5 animate-slide-right-fade-in">
                                  <Check className="h-3 w-3" />
                                  <span>Selected</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Empty state - Only show when no library items and not processing PDF */}
                    {Object.values(pdfGroups).length === 0 &&
                      singleImages.length === 0 &&
                      processingPdfNames.size === 0 && (
                        <Card className="col-span-full flex flex-col items-center justify-center py-12 gap-0 text-muted-foreground group/empty-state min-h-[400px]">
                          <SquareLibrary className="h-32 w-32 mb-2 text-muted-foreground/75 group-hover/empty-state:animate-shake-twice" />
                          <p className="text-4xl font-bold text-muted-foreground/75">
                            It looks kind of empty in here...
                          </p>
                          <p className="text-lg mt-2 text-muted-foreground/50">
                            Use the upload cards above!
                          </p>
                        </Card>
                      )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer with confirmation button */}
          {(selectedImageId ||
            (allowMultipleSelection && selectedImageIds.size > 0)) && (
            <div className="px-6 py-4 flex items-center justify-center bg-muted/50 animate-slide-up-fade-in">
              <Button
                onClick={handleConfirmSelection}
                disabled={
                  allowMultipleSelection
                    ? selectedImageIds.size === 0
                    : !selectedImageData
                }
                className="bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                {allowMultipleSelection
                  ? `Add ${selectedImageIds.size} New Slide${selectedImageIds.size !== 1 ? "s" : ""}`
                  : "Replace Image"}
              </Button>
            </div>
          )}

          {/* Video Dialog */}
          {onAddVideo && (
            <VideoDialog
              open={showYouTubeDialog}
              onOpenChange={setShowYouTubeDialog}
              onAddVideo={onAddVideo}
            />
          )}

          {/* Custom Footer Message */}
          {footerMessage && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-50 animate-[slideUpFromBottom_0.3s_ease-out]">
              <div
                className={`w-auto max-w-md border-t border-l border-r shadow-lg rounded-t-lg ${
                  footerMessage.type === "success"
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                {/* Header */}
                <div
                  className={`px-4 py-2 rounded-t-lg ${
                    footerMessage.type === "success"
                      ? "bg-green-600"
                      : "bg-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {footerMessage.type === "success" ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <X className="h-4 w-4 text-white" />
                    )}
                    <h3 className="font-semibold text-sm text-white">
                      {footerMessage.type === "success" ? "Success" : "Fail"}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <div className="px-4 py-3">
                  <p className="text-xs text-foreground font-medium capitalize">
                    {footerMessage.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
