"use client";

import { useState, useRef } from "react";
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
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Folder,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ImageSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageData: Blob, blobUrl: string) => void;
}

export function ImageSelectorDialog({
  open,
  onOpenChange,
  onSelectImage,
}: ImageSelectorDialogProps) {
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentPdfFolder, setCurrentPdfFolder] = useState<string | null>(null); // null = main library, string = PDF ID
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<{
    blob: Blob;
    blobUrl: string;
  } | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const { pdfPages, singleImages, addPdfPages, addSingleImage, getAllItems } =
    useSessionLibraryStore();

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

  const handlePdfUpload = async (file: File) => {
    setIsProcessingPdf(true);
    try {
      const pages = await convertPdfToImages(file);
      if (pages.length === 0) {
        toast.error("PDF has no pages");
        return;
      }

      // Generate unique PDF ID
      const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pdfName = file.name.replace(/\.pdf$/i, "");

      // Add pages to session library
      addPdfPages(pages, pdfName, pdfId);

      toast.success(`PDF converted: ${pages.length} pages added to library`);
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process PDF. Please try again."
      );
    } finally {
      setIsProcessingPdf(false);
      if (pdfFileInputRef.current) {
        pdfFileInputRef.current.value = "";
      }
    }
  };

  const handleSingleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploadingImage(true);
    try {
      addSingleImage(file);
      toast.success("Image added to library");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
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
    setSelectedImageId(imageId);
    setSelectedImageData({ blob: imageData, blobUrl });
  };

  const handleConfirmSelection = () => {
    if (selectedImageData) {
      onSelectImage(selectedImageData.blob, selectedImageData.blobUrl);
      onOpenChange(false);
      // Reset selection state
      setSelectedImageId(null);
      setSelectedImageData(null);
    }
  };

  const handleCancelSelection = () => {
    setSelectedImageId(null);
    setSelectedImageData(null);
  };

  const handleFolderClick = (pdfId: string) => {
    setCurrentPdfFolder(pdfId);
    // Clear selection when navigating
    setSelectedImageId(null);
    setSelectedImageData(null);
  };

  const handleBackToLibrary = () => {
    setCurrentPdfFolder(null);
    // Clear selection when navigating
    setSelectedImageId(null);
    setSelectedImageData(null);
  };

  // Reset selection and folder view when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedImageId(null);
      setSelectedImageData(null);
      setCurrentPdfFolder(null); // Reset to main library view
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="!min-w-[50vw] !w-[50vw] !min-h-[80vh] !h-[80vh] max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Select Image</DialogTitle>
          <DialogDescription>
            Choose an image from your library or upload a new one.
          </DialogDescription>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 h-full">
            <div className="p-6">
              {/* Show folder contents if inside a folder */}
              {currentPdfFolder ? (
                (() => {
                  const currentGroup = pdfGroups[currentPdfFolder];
                  if (!currentGroup) return null;
                  return (
                    <div className="space-y-4">
                      {/* Sticky header with back button and PDF name */}
                      <div className="sticky top-0 z-10 bg-background pb-4 pt-2 -mt-2 -mx-6 px-6 border-b">
                        <div className="flex items-center gap-4">
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
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {currentGroup.pages
                          .sort((a, b) => a.pageNumber - b.pageNumber)
                          .map((page) => (
                            <Card
                              key={page.id}
                              className={`relative cursor-pointer transition-all hover:shadow-md hover:scale-105 ${
                                selectedImageId === page.id
                                  ? "ring-2 ring-primary ring-offset-2 scale-105"
                                  : ""
                              }`}
                              onClick={() =>
                                handleImageClick(
                                  page.imageData,
                                  page.blobUrl,
                                  page.id
                                )
                              }
                            >
                              <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                                <Image
                                  src={page.blobUrl}
                                  alt={`Page ${page.pageNumber}`}
                                  fill
                                  className="object-contain"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                />
                                <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                                  Page {page.pageNumber}
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  {/* Upload Cards - Always show first */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Upload Single Image Card */}
                    <Card className="border-2 border-dashed border-muted-foreground/30 cursor-pointer transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md overflow-hidden">
                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleSingleImageUpload(file);
                          }
                        }}
                        className="hidden"
                      />
                      <div
                        className="relative aspect-video w-full flex flex-col items-center justify-center gap-3 p-6"
                        onClick={() => imageFileInputRef.current?.click()}
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm font-medium">
                              Uploading image...
                            </p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm font-medium text-center">
                              Upload Single Image
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                              Add to library
                            </p>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Upload PDF Card */}
                    <Card className="border-2 border-dashed border-muted-foreground/30 cursor-pointer transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md overflow-hidden">
                      <input
                        ref={pdfFileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePdfUpload(file);
                          }
                        }}
                        className="hidden"
                      />
                      <div
                        className="relative aspect-video w-full flex flex-col items-center justify-center gap-3 p-6"
                        onClick={() => pdfFileInputRef.current?.click()}
                      >
                        {isProcessingPdf ? (
                          <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm font-medium">
                              Processing PDF...
                            </p>
                          </>
                        ) : (
                          <>
                            <FileText className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm font-medium text-center">
                              Upload PDF
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                              Creates folder with pages
                            </p>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* PDF Folders */}
                    {Object.values(pdfGroups).map((group) => {
                      const firstPage = group.pages.sort(
                        (a, b) => a.pageNumber - b.pageNumber
                      )[0];
                      return (
                        <Card
                          key={group.pdfId}
                          className={`relative cursor-pointer transition-all hover:shadow-md hover:scale-105 border-dashed ${
                            selectedImageId === group.pdfId
                              ? "ring-2 ring-primary ring-offset-2 scale-105"
                              : ""
                          }`}
                          onClick={() => handleFolderClick(group.pdfId)}
                        >
                          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                            {firstPage ? (
                              <Image
                                src={firstPage.blobUrl}
                                alt={group.pdfName}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Folder className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {/* Overlay with folder icon and info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent flex flex-col justify-end p-3">
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <p className="text-xs font-medium truncate">
                                  {group.pdfName}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {group.pages.length}{" "}
                                {group.pages.length === 1 ? "page" : "pages"}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}

                    {/* Single Images */}
                    {singleImages.map((image) => (
                      <Card
                        key={image.id}
                        className={`relative cursor-pointer transition-all hover:shadow-md hover:scale-105 ${
                          selectedImageId === image.id
                            ? "ring-2 ring-primary ring-offset-2 scale-105"
                            : ""
                        }`}
                        onClick={() =>
                          handleImageClick(
                            image.imageData,
                            image.blobUrl,
                            image.id
                          )
                        }
                      >
                        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                          <Image
                            src={image.blobUrl}
                            alt={image.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {image.name}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Empty state - Only show when no library items */}
                  {Object.values(pdfGroups).length === 0 &&
                    singleImages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm font-medium">
                          No images in library
                        </p>
                        <p className="text-xs mt-2">
                          Use the upload cards above to add images
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer with confirmation button */}
        {selectedImageId && (
          <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/50">
            <div className="text-sm text-muted-foreground">
              Image selected. Click "Select Slide" to apply it.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelSelection}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSelection}>Select Slide</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
