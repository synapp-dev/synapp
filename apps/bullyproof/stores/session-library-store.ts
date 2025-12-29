import { create } from "zustand";
import type { PdfPageImage } from "@/utils/pdf-converter";
import { revokeBlobUrls } from "@/utils/pdf-converter";

export interface SessionLibraryPage extends PdfPageImage {
  id: string; // Unique ID for the page
  pdfName?: string; // Name of the PDF file this page came from
  pdfId?: string; // Unique ID for the PDF (groups pages from same PDF)
}

export interface SessionLibraryImage {
  id: string;
  blobUrl: string;
  imageData: Blob;
  name: string; // Original filename
  uploadedAt: number; // Timestamp
}

interface SessionLibraryState {
  pdfPages: SessionLibraryPage[];
  singleImages: SessionLibraryImage[];

  // Add pages from a PDF conversion (grouped by PDF)
  addPdfPages: (pages: PdfPageImage[], pdfName: string, pdfId: string) => void;

  // Add a single image
  addSingleImage: (file: File) => void;

  // Remove a specific page by ID
  removePage: (id: string) => void;

  // Remove a single image by ID
  removeImage: (id: string) => void;

  // Clear all pages from the session library
  clearSessionLibrary: () => void;

  // Get page by ID
  getPageById: (id: string) => SessionLibraryPage | undefined;

  // Get image by ID
  getImageById: (id: string) => SessionLibraryImage | undefined;

  // Get all items (pages + images) for display
  getAllItems: () => Array<SessionLibraryPage | SessionLibraryImage>;
}

export const useSessionLibraryStore = create<SessionLibraryState>((set, get) => ({
  pdfPages: [],
  singleImages: [],

  addPdfPages: (pages: PdfPageImage[], pdfName: string, pdfId: string) => {
    const newPages: SessionLibraryPage[] = pages.map((page) => ({
      ...page,
      id: `pdf_page_${pdfId}_${page.pageNumber}_${Math.random().toString(36).substr(2, 9)}`,
      pdfName,
      pdfId,
    }));

    set((state) => ({
      pdfPages: [...state.pdfPages, ...newPages],
    }));
  },

  addSingleImage: (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // File extends Blob, so we can use it directly
    const newImage: SessionLibraryImage = {
      id: imageId,
      blobUrl,
      imageData: file, // File extends Blob
      name: file.name,
      uploadedAt: Date.now(),
    };

    set((state) => ({
      singleImages: [...state.singleImages, newImage],
    }));
  },

  removePage: (id: string) => {
    set((state) => {
      const pageToRemove = state.pdfPages.find((p) => p.id === id);
      if (pageToRemove) {
        // Revoke blob URL to free memory
        revokeBlobUrls([pageToRemove.blobUrl]);
      }

      return {
        pdfPages: state.pdfPages.filter((p) => p.id !== id),
      };
    });
  },

  removeImage: (id: string) => {
    set((state) => {
      const imageToRemove = state.singleImages.find((img) => img.id === id);
      if (imageToRemove) {
        // Revoke blob URL to free memory
        revokeBlobUrls([imageToRemove.blobUrl]);
      }

      return {
        singleImages: state.singleImages.filter((img) => img.id !== id),
      };
    });
  },

  clearSessionLibrary: () => {
    const state = get();
    // Revoke all blob URLs before clearing
    const pdfBlobUrls = state.pdfPages.map((p) => p.blobUrl);
    const imageBlobUrls = state.singleImages.map((img) => img.blobUrl);
    revokeBlobUrls([...pdfBlobUrls, ...imageBlobUrls]);

    set({ pdfPages: [], singleImages: [] });
  },

  getPageById: (id: string) => {
    return get().pdfPages.find((p) => p.id === id);
  },

  getImageById: (id: string) => {
    return get().singleImages.find((img) => img.id === id);
  },

  getAllItems: () => {
    const state = get();
    return [...state.pdfPages, ...state.singleImages];
  },
}));




