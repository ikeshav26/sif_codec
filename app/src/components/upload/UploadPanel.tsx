import React, { useState, useRef } from "react";
import { useImageStore } from "../../store/useImageStore";
import {
  UploadCloud,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldAlert,
  Layers,
  X,
  User,
  Key,
} from "lucide-react";

export const UploadPanel: React.FC = () => {
  const {
    uploadImage,
    isUploading,
    uploadProgress,
    uploadError,
    ownershipConflict,
    latestImage,
    latestStats,
    clearLatestUpload,
  } = useImageStore();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    const isSif = file.name.toLowerCase().endsWith(".sif");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isSif) {
      alert("Please select a valid image or .sif container file");
      return;
    }

    setSelectedFile(file);
    clearLatestUpload();

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const success = await uploadImage(selectedFile);
    if (success) {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-black">Encode & Secure</h2>
            <span className="rounded bg-black text-white px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-semibold">
              30% STUDIO
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Convert images or verify .sif container ownership
          </p>
        </div>
      </div>

      {/* Main Upload Body */}
      <div className="mt-4 flex-1 flex flex-col space-y-4">
        {/* Dropzone */}
        {!selectedFile && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-black bg-zinc-50"
                : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.sif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 transition-colors">
              <UploadCloud className="h-5 w-5 text-black" />
            </div>
            <p className="mt-3 text-xs font-medium text-zinc-800">
              Drag & drop image or <span className="underline font-semibold text-black">.sif container</span>
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Supports PNG, JPG, WebP, AVIF, BMP, and .sif containers (Up to 25MB)
            </p>
          </div>
        )}

        {/* Selected File Stage */}
        {selectedFile && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-12 w-12 rounded border border-zinc-200 object-cover bg-white shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-700 font-mono text-xs font-bold shrink-0">
                    {selectedFile.name.toLowerCase().endsWith(".sif") ? ".SIF" : <FileImage className="h-6 w-6" />}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-zinc-900 truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {formatBytes(selectedFile.size)}
                    </span>
                    <span className="rounded bg-zinc-200 px-1 py-0.2 text-[9px] font-mono text-zinc-700 uppercase">
                      {selectedFile.name.toLowerCase().endsWith(".sif")
                        ? "SIF-CONTAINER"
                        : selectedFile.type.split("/")[1] || "IMG"}
                    </span>
                  </div>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={clearSelection}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-black transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Upload Action Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing & Verifying ({uploadProgress}%)</span>
                </>
              ) : selectedFile.name.toLowerCase().endsWith(".sif") ? (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  <span>Verify SIF Ownership & Register</span>
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  <span>Encode & Save SIF Container</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Ownership Conflict Warning Box */}
        {ownershipConflict && (
          <div className="rounded-lg border-2 border-black bg-zinc-100 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-black text-white">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-black uppercase tracking-tight">
                    Ownership Conflict Detected
                  </h4>
                  <p className="text-[10px] text-zinc-600 font-mono">
                    Cryptographic signature mismatch
                  </p>
                </div>
              </div>

              <button
                onClick={clearLatestUpload}
                className="text-zinc-500 hover:text-black transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded border border-zinc-300 bg-white p-3 space-y-2 text-xs">
              <p className="text-[11px] text-zinc-800 font-medium leading-tight">
                This SIF container belongs to another registered user.
              </p>

              <div className="space-y-1.5 pt-1 border-t border-zinc-100 font-mono text-[11px]">
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                    <User className="h-3 w-3" /> Registered Owner:
                  </span>
                  <span className="font-semibold text-black">
                    {ownershipConflict.originalOwnerName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span className="text-zinc-500 text-[10px]">Masked Email:</span>
                  <span className="text-zinc-800">{ownershipConflict.originalOwnerEmail}</span>
                </div>

                {ownershipConflict.registeredAt && (
                  <div className="flex items-center justify-between text-zinc-700">
                    <span className="text-zinc-500 text-[10px]">Registered On:</span>
                    <span className="text-zinc-600">
                      {new Date(ownershipConflict.registeredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="pt-1 text-[10px] text-zinc-500 flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  <span className="truncate">UUID: {ownershipConflict.imageUuid}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 leading-tight">
              Action blocked: Only the original creator holding the matching owner ID key can modify or register this container.
            </p>
          </div>
        )}

        {/* General Upload Error */}
        {uploadError && !ownershipConflict && (
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-black" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Latest Encoded Stats */}
        {latestImage && latestStats && (
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-black">
                <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                <span>SIF Container Created</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {latestImage.imageUuid.substring(0, 8)}...
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="rounded border border-zinc-200 bg-white p-2">
                <span className="text-[10px] text-zinc-400 block">ORIGINAL SIZE</span>
                <span className="font-semibold text-zinc-800">
                  {formatBytes(latestStats.originalBytes)}
                </span>
              </div>
              <div className="rounded border border-zinc-200 bg-white p-2">
                <span className="text-[10px] text-zinc-400 block">SIF CONTAINER</span>
                <span className="font-semibold text-zinc-800">
                  {formatBytes(latestStats.sifBytes)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-200/60 font-mono">
              <span>Overhead: +{latestStats.overheadBytes} B (Header + Tag)</span>
              <span>Cipher: AES-GCM</span>
            </div>
          </div>
        )}

        {/* Info / Spec Note */}
        <div className="mt-auto border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700">
            <Layers className="h-3 w-3" />
            <span>SIF Provenance Protection:</span>
          </div>
          <p className="text-[10px] font-mono text-zinc-500 pl-4.5">
            Owner SHA-256 hash is embedded in the signed container header to block unauthorized re-uploads.
          </p>
        </div>
      </div>
    </div>
  );
};
