import React from "react";
import { useImageStore } from "../../store/useImageStore";
import { X, Shield, Binary, Key, UserCheck, Cpu, Loader2 } from "lucide-react";

export const HeaderInspectModal: React.FC = () => {
  const {
    activeModal,
    selectedImage,
    selectedHeader,
    inspectLoading,
    closeModal,
  } = useImageStore();

  if (activeModal !== "inspect" || !selectedImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
              <Binary className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                SIF Container Header Inspector
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                {selectedImage.originalName} ({selectedImage.imageUuid})
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

        {/* Content */}
        <div className="mt-4">
          {inspectLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-black mb-2" />
              <p className="text-xs font-mono">Parsing SIF binary header via Rust codec...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Grid Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Shield className="h-3.5 w-3.5 text-black" />
                    <span className="text-[10px] uppercase font-mono tracking-wider">Magic & Version</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 text-sm">
                      {selectedHeader?.magic || "SIF1"}
                    </span>
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono">
                      v{selectedHeader?.version ?? 1}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Cpu className="h-3.5 w-3.5 text-black" />
                    <span className="text-[10px] uppercase font-mono tracking-wider">Cipher Suite</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900 text-sm">
                    {selectedHeader?.cipherSuite === 1
                      ? "AES-256-GCM"
                      : selectedHeader?.cipherSuite === 2
                      ? "ChaCha20-Poly1305"
                      : "AES-256-GCM (0x01)"}
                  </span>
                </div>
              </div>

              {/* Security Identifiers */}
              <div className="space-y-2 text-xs font-mono">
                <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-0.5">
                    <UserCheck className="h-3 w-3 text-zinc-700" />
                    <span>OWNER ID HASH (SHA-256)</span>
                  </div>
                  <p className="text-[11px] text-zinc-900 break-all select-all">
                    {selectedHeader?.ownerIdHash || selectedImage.ownerIdHash || "N/A"}
                  </p>
                </div>

                <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-0.5">
                    <Key className="h-3 w-3 text-zinc-700" />
                    <span>KEY ENCRYPTION KEY (KEK) ID</span>
                  </div>
                  <p className="text-[11px] text-zinc-900 break-all select-all">
                    {selectedHeader?.kekId || selectedImage.kekId || "N/A"}
                  </p>
                </div>
              </div>

              {/* Raw Header JSON */}
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                  Raw Header Metadata
                </span>
                <pre className="max-h-36 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-200">
                  {JSON.stringify(
                    {
                      magic: selectedHeader?.magic || "SIF1",
                      version: selectedHeader?.version || 1,
                      cipherSuite: selectedHeader?.cipherSuite || 1,
                      imageUuid: selectedImage.imageUuid,
                      originalSize: selectedImage.originalSize,
                      sifSize: selectedImage.sifSize,
                      mimeType: selectedImage.mimeType,
                      sifPath: selectedImage.sifPath,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-zinc-100 pt-3">
          <button
            onClick={closeModal}
            className="rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
