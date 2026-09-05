import React, { useState, useEffect } from "react";
import { useImageStore } from "../../store/useImageStore";
import {
  Lock,
  Binary,
  Eye,
  Download,
  Search,
  RefreshCw,
  Calendar,
  HardDrive,
  Copy,
  Check,
  FileCode,
} from "lucide-react";

export const VaultPanel: React.FC = () => {
  const {
    images,
    isLoading,
    fetchImages,
    inspectImage,
    previewImage,
    downloadSif,
  } = useImageStore();

  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleCopyUuid = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uuid);
    setCopiedId(uuid);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredImages = images.filter((img) =>
    img.originalName.toLowerCase().includes(search.toLowerCase()) ||
    img.imageUuid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-black">Secured SIF Vault</h2>
            <span className="rounded bg-zinc-100 border border-zinc-200 text-zinc-700 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-semibold">
              70% VAULT
            </span>
            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-mono font-medium text-white">
              {images.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Encrypted container registry with AEAD verification
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search filename or UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 sm:w-56 rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs font-mono text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <button
            onClick={() => fetchImages()}
            disabled={isLoading}
            title="Refresh list"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-black transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Vault Content */}
      <div className="mt-4 flex-1 overflow-y-auto">
        {isLoading && images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <RefreshCw className="h-6 w-6 animate-spin text-black mb-2" />
            <p className="text-xs font-mono">Loading encrypted containers...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-800">
              {search ? "No matching SIF images found" : "No secured images yet"}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
              {search
                ? "Try a different filename or UUID keyword"
                : "Upload an image in the left panel to generate your first encrypted .sif container"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-xs transition-all"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-700 shrink-0">
                        <FileCode className="h-3.5 w-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-semibold text-zinc-900 truncate">
                          {image.originalName}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {image.mimeType}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded bg-black px-1.5 py-0.5 text-[9px] font-mono font-medium text-white shrink-0">
                      <Lock className="h-2.5 w-2.5" />
                      SIF-1
                    </span>
                  </div>

                  {/* UUID Bar */}
                  <div className="mt-3 flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] font-mono text-zinc-600">
                    <span className="truncate max-w-[170px]" title={image.imageUuid}>
                      UUID: {image.imageUuid}
                    </span>
                    <button
                      onClick={(e) => handleCopyUuid(image.imageUuid, e)}
                      title="Copy full UUID"
                      className="text-zinc-400 hover:text-black ml-1 transition-colors"
                    >
                      {copiedId === image.imageUuid ? (
                        <Check className="h-3 w-3 text-black" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {/* Metrics */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-600">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-zinc-400" />
                      <span>Original: {formatBytes(image.originalSize)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-zinc-400" />
                      <span>SIF: {formatBytes(image.sifSize)}</span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(image.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={() => inspectImage(image)}
                    title="Inspect SIF Header"
                    className="flex items-center justify-center gap-1 rounded border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:text-black hover:border-zinc-300 transition-colors"
                  >
                    <Binary className="h-3 w-3" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => previewImage(image)}
                    title="Decrypt & Preview"
                    className="flex items-center justify-center gap-1 rounded bg-black py-1.5 text-[11px] font-medium text-white hover:bg-zinc-800 transition-colors shadow-xs"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Decrypt</span>
                  </button>

                  <button
                    onClick={() => downloadSif(image)}
                    title="Download .sif file"
                    className="flex items-center justify-center gap-1 rounded border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:text-black hover:border-zinc-300 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>.SIF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
