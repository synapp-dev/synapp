import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
// pdfjs-dist 4.x uses .mjs files for the worker
if (typeof window !== "undefined") {
  // Use local worker file from public folder (most reliable)
  // The worker file is copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs
  // to public/pdf.worker.min.mjs during setup
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface PdfPageImage {
  pageNumber: number;
  blobUrl: string;
  imageData: Blob;
}

/**
 * Converts a PDF file to an array of image blobs (one per page)
 * @param file - The PDF file to convert
 * @returns Array of page images with blob URLs and blob data
 */
export async function convertPdfToImages(
  file: File
): Promise<PdfPageImage[]> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pages: PdfPageImage[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Set up canvas for rendering
      const viewport = page.getViewport({ scale: 2.0 }); // Scale 2.0 for better quality
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convert canvas to blob (JPG format)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert canvas to blob"));
            }
          },
          "image/jpeg",
          0.95 // Quality: 0.95 for good balance between quality and file size
        );
      });

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(blob);

      pages.push({
        pageNumber: pageNum,
        blobUrl,
        imageData: blob,
      });
    }

    return pages;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw new Error(
      `Failed to convert PDF to images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Revokes blob URLs to free up memory
 * @param blobUrls - Array of blob URLs to revoke
 */
export function revokeBlobUrls(blobUrls: string[]): void {
  blobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Failed to revoke blob URL:", error);
    }
  });
}

