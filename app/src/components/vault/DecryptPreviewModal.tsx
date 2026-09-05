import React from "react";
import { useImageStore } from "../../store/useImageStore";
import { X, Unlock, Download, Loader2, CheckCircle2 } from "lucide-react";

export const DecryptPreviewModal: React.FC = () => {
  const {
    activeModal,
    selectedImage,
    previewBlobUrl,
    previewLoading,
    closeModal,
  } = useImageStore();

  if (activeModal !== "preview" || !selectedImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
              <Unlock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  On-the-Fly SIF Decryption
                </h3>
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-700">
                  <CheckCircle2 className="h-3 w-3 text-black" />
                  Authenticated
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                {selectedImage.originalName} • {selectedImage.mimeType}
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Viewer */}
        <div className="mt-4 flex-1 flex flex-col items-center justify-center min-h-[280px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-black mb-2" />
              <p className="text-xs font-mono">Decrypting SIF ciphertext via Rust AEAD engine...</p>
            </div>
          ) : previewBlobUrl ? (
            <div className="relative max-h-[460px] w-full flex items-center justify-center overflow-auto rounded bg-zinc-100/50">
              <img
                src={previewBlobUrl}
                alt={selectedImage.originalName}
                className="max-h-[440px] max-w-full rounded object-contain shadow-sm"
              />
            </div>
          ) : (
            <div className="text-center text-xs text-zinc-400">
              Failed to load decrypted image.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
          <div className="text-[11px] font-mono text-zinc-500">
            UUID: {selectedImage.imageUuid}
          </div>

          <div className="flex items-center gap-2">
            {previewBlobUrl && (
              <a
                href={previewBlobUrl}
                download={selectedImage.originalName}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save Decrypted Image</span>
              </a>
            )}
            <button
              onClick={closeModal}
              className="rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
