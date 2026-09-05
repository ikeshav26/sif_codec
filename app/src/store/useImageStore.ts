import { create } from "zustand";
import api from "../api/client";
import type { ImageRecord, SifHeader, UploadStats, OwnershipConflict } from "../types";

interface ImageState {
  images: ImageRecord[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  ownershipConflict: OwnershipConflict | null;
  latestStats: UploadStats | null;
  latestImage: ImageRecord | null;

  // Modals state
  selectedImage: ImageRecord | null;
  selectedHeader: SifHeader | null;
  inspectLoading: boolean;
  previewBlobUrl: string | null;
  previewLoading: boolean;
  activeModal: "inspect" | "preview" | null;

  // Actions
  fetchImages: () => Promise<void>;
  uploadImage: (file: File) => Promise<boolean>;
  inspectImage: (image: ImageRecord) => Promise<void>;
  previewImage: (image: ImageRecord) => Promise<void>;
  downloadSif: (image: ImageRecord) => Promise<void>;
  closeModal: () => void;
  clearLatestUpload: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  ownershipConflict: null,
  latestStats: null,
  latestImage: null,

  selectedImage: null,
  selectedHeader: null,
  inspectLoading: false,
  previewBlobUrl: null,
  previewLoading: false,
  activeModal: null,

  fetchImages: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ images: ImageRecord[] }>("/images");
      set({ images: res.data.images || [], isLoading: false });
    } catch (err: any) {
      console.error("Failed to fetch images:", err);
      set({ isLoading: false });
    }
  },

  uploadImage: async (file: File) => {
    set({
      isUploading: true,
      uploadProgress: 0,
      uploadError: null,
      ownershipConflict: null,
    });
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post<{
        message: string;
        image: ImageRecord;
        stats: UploadStats;
      }>("/images/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: percent });
          }
        },
      });

      set((state) => ({
        isUploading: false,
        uploadProgress: 100,
        latestImage: res.data.image,
        latestStats: res.data.stats,
        images: [res.data.image, ...state.images],
      }));

      return true;
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      const conflict = err.response?.data?.conflict as OwnershipConflict | undefined;
      set({
        isUploading: false,
        ownershipConflict: conflict || null,
        uploadError: err.response?.data?.message || err.message || "Failed to encode and upload image",
      });
      return false;
    }
  },

  inspectImage: async (image: ImageRecord) => {
    set({ selectedImage: image, inspectLoading: true, activeModal: "inspect" });
    try {
      const res = await api.get<{ image: ImageRecord; sifHeader: SifHeader }>(
        `/images/${image.id}`
      );
      set({
        selectedHeader: res.data.sifHeader,
        inspectLoading: false,
      });
    } catch (err: any) {
      console.error("Failed to inspect SIF image header:", err);
      set({ inspectLoading: false });
    }
  },

  previewImage: async (image: ImageRecord) => {
    const currentUrl = get().previewBlobUrl;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }

    set({
      selectedImage: image,
      previewLoading: true,
      previewBlobUrl: null,
      activeModal: "preview",
    });

    try {
      const res = await api.get(`/images/${image.id}/view`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      set({ previewBlobUrl: blobUrl, previewLoading: false });
    } catch (err: any) {
      console.error("Failed to decrypt and preview image:", err);
      set({ previewLoading: false });
    }
  },

  downloadSif: async (image: ImageRecord) => {
    try {
      const res = await api.get(`/images/${image.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${image.imageUuid}.sif`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to download .sif file:", err);
    }
  },

  closeModal: () => {
    const currentUrl = get().previewBlobUrl;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    set({
      activeModal: null,
      selectedImage: null,
      selectedHeader: null,
      previewBlobUrl: null,
    });
  },

  clearLatestUpload: () => {
    set({ latestImage: null, latestStats: null, uploadError: null, ownershipConflict: null });
  },
}));
