"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Send,
  Paperclip,
  Binary,
  Download,
  Lock,
  RefreshCw,
  X,
  User,
  Cpu,
  Layers,
  Clock,
  Mail,
  CheckCircle2,
  Maximize2,
  Image as ImageIcon,
} from "lucide-react";

interface SifData {
  fileName: string;
  imageUuid: string;
  ownerIdHash: string;
  cipherSuite: number;
  payloadLength: number;
  sifVerified: boolean;
  sifBase64?: string;
  verificationStatus?: "VERIFIED" | "PENDING_APPROVAL" | "REJECTED";
  verificationToken?: string;
  ownerEmail?: string;
  approvedAt?: string;
}

interface MessageItem {
  _id: string;
  senderName: string;
  senderEmail: string;
  content: string;
  isSif: boolean;
  sifData?: SifData;
  createdAt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Active Chat Identity
  const [currentUser, setCurrentUser] = useState({
    name: "Alice (Creator)",
    email: "alice@sif.io",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownerEmailOverride, setOwnerEmailOverride] = useState("");

  // Message Form State
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inspector & Lightbox Modals
  const [inspectSif, setInspectSif] = useState<SifData | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    fileName: string;
    sifData: SifData;
  } | null>(null);

  const fetchMessages = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages?viewerEmail=${encodeURIComponent(currentUser.email)}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.email]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchMessages();
    };
    const timeout = setTimeout(load, 0);
    const interval = setInterval(() => {
      void fetchMessages();
    }, 3500);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedFile) return;

    setSending(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("senderName", currentUser.name);
    formData.append("senderEmail", currentUser.email);
    formData.append("content", textInput);

    if (selectedFile) {
      formData.append("sifFile", selectedFile);
      if (ownerEmailOverride.trim()) {
        formData.append("ownerEmail", ownerEmailOverride.trim());
      }
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTextInput("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setErrorMessage(data.details || data.error || "Failed to send message");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      console.error("Failed to send message:", err);
      setErrorMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadSif = (sif: SifData) => {
    if (!sif.sifBase64) return;
    const byteCharacters = atob(sif.sifBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/octet-stream" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sif.fileName || `${sif.imageUuid}.sif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-black tracking-tight">SIF Secure Chat</h1>
                <span className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.2 text-[10px] font-mono font-medium text-zinc-700">
                  MongoDB • Zero SIF-DB
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Decentralized SIF container verification demo
              </p>
            </div>
          </div>

          {/* Identity Switcher */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-medium text-zinc-500">
              Posting as:
            </span>
            <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() =>
                  setCurrentUser({
                    name: "Alice (Creator)",
                    email: "alice@sif.io",
                  })
                }
                className={`rounded px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                  currentUser.email === "alice@sif.io"
                    ? "bg-black text-white font-semibold"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                Alice (alice@sif.io)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentUser({
                    name: "Bob (Forwarder)",
                    email: "bob@sif.io",
                  })
                }
                className={`rounded px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                  currentUser.email === "bob@sif.io"
                    ? "bg-black text-white font-semibold"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                Bob (bob@sif.io)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Body */}
      <main className="flex-1 mx-auto flex w-full max-w-5xl flex-col overflow-hidden px-4 py-4 sm:px-6">
        <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 space-y-4 shadow-sm">
          {loading && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin text-black mb-2" />
              <p className="text-xs font-mono">Connecting to MongoDB & SIF verifier...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400 py-16">
              <Layers className="h-10 w-10 text-zinc-300 mb-2" />
              <p className="text-xs font-semibold text-zinc-700">Chat history is clean</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                Send a message or attach a .sif container to test zero-DB provenance verification
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderEmail === currentUser.email;

              return (
                <div
                  key={msg._id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1 font-mono">
                    <User className="h-3 w-3" />
                    <span className="font-semibold text-zinc-900">{msg.senderName}</span>
                    <span>({msg.senderEmail})</span>
                    <span>• {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div
                    className={`max-w-lg rounded-xl border p-3.5 space-y-2 text-xs shadow-xs ${
                      isMe
                        ? "border-zinc-300 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    {/* Text Content */}
                    {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                    {/* SIF Container Attachment Card */}
                    {msg.isSif && msg.sifData && (
                      <div
                        className={`rounded-lg border p-3 space-y-2.5 ${
                          isMe ? "border-zinc-700 bg-zinc-800" : "border-zinc-300 bg-white"
                        }`}
                      >
                        {/* Verification Provenance Badge */}
                        <div className="flex items-center justify-between gap-2 border-b pb-2 border-zinc-200/40">
                          {msg.sifData.verificationStatus === "PENDING_APPROVAL" ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                              <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              <span>⏳ Waiting for Owner Approval</span>
                            </div>
                          ) : msg.sifData.verificationStatus === "REJECTED" ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400">
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                              <span>❌ Transfer Rejected by Owner</span>
                            </div>
                          ) : msg.sifData.approvedAt ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <span>SIF Verified (Owner Approved)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>SIF Verified Creator</span>
                            </div>
                          )}

                          <span className="text-[10px] font-mono opacity-60">
                            {(msg.sifData.payloadLength / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        {/* Informational Callout when Pending or Rejected */}
                        {msg.sifData.verificationStatus === "PENDING_APPROVAL" && (
                          <div className="rounded border border-amber-300/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-200 font-sans space-y-1.5">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>Authorization request email sent to:</span>
                            </p>
                            <p className="font-mono text-[10px] font-bold break-all pl-5">
                              {msg.sifData.ownerEmail || "owner"}
                            </p>
                            <p className="text-[10px] opacity-80 pl-5">
                              This container is held in pending status. As soon as the owner approves from email, the decrypted image will instantly render here.
                            </p>
                            <div className="pl-5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => void fetchMessages()}
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-amber-800 dark:text-amber-300 underline hover:opacity-80 cursor-pointer"
                              >
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                <span>Re-check verification status</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.sifData.verificationStatus === "REJECTED" && (
                          <div className="rounded border border-rose-300/40 bg-rose-500/10 p-2 text-[11px] text-rose-800 dark:text-rose-200 font-sans">
                            <p className="text-[10px]">
                              The original creator denied authorization for this transfer. Image decoding and download access remain locked.
                            </p>
                          </div>
                        )}

                        {/* Decrypted Hero Image Display for Verified SIF Containers */}
                        {(msg.sifData.verificationStatus === "VERIFIED" || msg.sifData.sifVerified) && (
                          <div className="space-y-2">
                            <div
                              onClick={() =>
                                setPreviewImage({
                                  url: `/api/messages/${msg._id}/image`,
                                  fileName: msg.sifData?.fileName || "Decrypted Image",
                                  sifData: msg.sifData!,
                                })
                              }
                              className="group relative overflow-hidden rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-950/5 dark:bg-black/50 cursor-pointer shadow-inner transition-all hover:border-zinc-400 dark:hover:border-zinc-500"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/messages/${msg._id}/image`}
                                alt={msg.sifData.fileName || "Decrypted SIF Image"}
                                className="w-full max-h-80 object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                                loading="lazy"
                              />

                              {/* Hover Zoom Overlay */}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[1px]">
                                <Maximize2 className="h-4 w-4" />
                                <span>Click to view full image</span>
                              </div>
                            </div>

                            {/* Clean File Name Banner */}
                            <div className="flex items-center justify-between gap-2 px-0.5">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <ImageIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-xs truncate">
                                  {msg.sifData.fileName}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                AES-256 Decrypted
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/30">
                          <button
                            type="button"
                            onClick={() => setInspectSif(msg.sifData!)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                              isMe
                                ? "border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-black"
                            }`}
                          >
                            <Binary className="h-3 w-3" />
                            <span>Inspect Header</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              msg.sifData.verificationStatus === "PENDING_APPROVAL" ||
                              msg.sifData.verificationStatus === "REJECTED"
                            }
                            onClick={() => handleDownloadSif(msg.sifData!)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-mono font-medium border transition-colors ${
                              msg.sifData.verificationStatus === "PENDING_APPROVAL" ||
                              msg.sifData.verificationStatus === "REJECTED"
                                ? "opacity-40 cursor-not-allowed border-zinc-700/20 text-zinc-400"
                                : isMe
                                ? "border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 cursor-pointer"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-black cursor-pointer"
                            }`}
                          >
                            <Download className="h-3 w-3" />
                            <span>
                              {msg.sifData.verificationStatus === "PENDING_APPROVAL"
                                ? "Locked (Pending)"
                                : msg.sifData.verificationStatus === "REJECTED"
                                ? "Locked (Rejected)"
                                : "Download .sif"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSendMessage} className="mt-3 space-y-2">
          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-xs">
              <span className="font-medium">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* File Selected Attachment Pill + Owner Email Config */}
          {selectedFile && (
            <div className="rounded-lg border border-zinc-300 bg-white p-2.5 text-xs shadow-xs space-y-2">
              <div className="flex items-center justify-between font-mono text-zinc-800">
                <div className="flex items-center gap-2 truncate">
                  <Lock className="h-3.5 w-3.5 text-black" />
                  <span className="font-semibold truncate">{selectedFile.name}</span>
                  <span className="text-[10px] text-zinc-400">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-zinc-400 hover:text-black transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {currentUser.name.includes("Bob") || currentUser.email !== "alice@sif.io" ? (
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Owner Email to Alert:
                  </span>
                  <input
                    type="email"
                    value={ownerEmailOverride}
                    onChange={(e) => setOwnerEmailOverride(e.target.value)}
                    placeholder="Auto-detected from image metadata (or enter owner email)"
                    className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-mono text-zinc-900 focus:outline-none focus:border-black placeholder:text-zinc-400"
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept=".sif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach .sif container"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              placeholder={`Message as ${currentUser.name}...`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1 bg-transparent px-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />

            <button
              type="submit"
              disabled={sending || (!textInput.trim() && !selectedFile)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-black px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </main>

      {/* SIF Header Inspector Modal */}
      {inspectSif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
                  <Binary className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Zero-DB SIF Container Inspector
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">{inspectSif.fileName}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectSif(null)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Provenance Status</span>
                  {inspectSif.verificationStatus === "VERIFIED" || inspectSif.sifVerified ? (
                    <span className="text-[10px] font-bold text-emerald-600">
                      {inspectSif.approvedAt ? "VERIFIED (OWNER AUTHORIZED)" : "ORIGINAL CREATOR MATCH"}
                    </span>
                  ) : inspectSif.verificationStatus === "REJECTED" ? (
                    <span className="text-[10px] font-bold text-rose-600">
                      TRANSFER REJECTED BY OWNER
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600">
                      PENDING OWNER APPROVAL
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-800">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Cipher Suite: AES-256-GCM (0x01)</span>
                </div>
                {inspectSif.approvedAt && (
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Approved at: {new Date(inspectSif.approvedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2.5">
                <span className="text-[10px] text-zinc-500 block mb-0.5">CONTAINER UUID</span>
                <p className="text-[11px] text-zinc-900 break-all select-all font-bold">
                  {inspectSif.imageUuid}
                </p>
              </div>

              <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2.5">
                <span className="text-[10px] text-zinc-500 block mb-0.5">
                  OWNER IDENTITY HASH (SHA-256)
                </span>
                <p className="text-[11px] text-zinc-900 break-all select-all">
                  {inspectSif.ownerIdHash}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={() => setInspectSif(null)}
                className="rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIF Decrypted Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] max-w-4xl w-full rounded-2xl border border-zinc-700/60 bg-zinc-950 p-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-zinc-100 truncate">
                    {previewImage.fileName}
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Decrypted from Zero-DB SIF Container • AES-256-GCM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSif(previewImage.sifData);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .sif</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4 min-h-[300px] max-h-[68vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.fileName}
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>

            {/* Lightbox Footer Meta */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Cryptographic Provenance
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sif = previewImage.sifData;
                  setPreviewImage(null);
                  setInspectSif(sif);
                }}
                className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                Inspect Full Header Details →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
