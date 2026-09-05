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
} from "lucide-react";

interface SifData {
  fileName: string;
  imageUuid: string;
  ownerIdHash: string;
  cipherSuite: number;
  payloadLength: number;
  sifVerified: boolean;
  sifBase64?: string;
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
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  // Message Form State
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inspector Modal
  const [inspectSif, setInspectSif] = useState<SifData | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedFile) return;

    setSending(true);
    const formData = new FormData();
    formData.append("senderName", currentUser.name);
    formData.append("senderEmail", currentUser.email);
    formData.append("content", textInput);

    if (selectedFile) {
      formData.append("sifFile", selectedFile);
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTextInput("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to send message:", err);
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
                          {msg.sifData.sifVerified ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>SIF Verified Creator</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                              <span>Forwarded / Unverified SIF</span>
                            </div>
                          )}

                          <span className="text-[10px] font-mono opacity-60">
                            {(msg.sifData.payloadLength / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        {/* File details */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="overflow-hidden">
                            <p className="font-semibold text-xs truncate">
                              {msg.sifData.fileName}
                            </p>
                            <p className="text-[10px] font-mono opacity-60 truncate">
                              UUID: {msg.sifData.imageUuid}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setInspectSif(msg.sifData!)}
                            className={`flex-1 inline-flex items-center justify-center gap-1 rounded py-1 text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
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
                            onClick={() => handleDownloadSif(msg.sifData!)}
                            className={`flex-1 inline-flex items-center justify-center gap-1 rounded py-1 text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                              isMe
                                ? "border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-black"
                            }`}
                          >
                            <Download className="h-3 w-3" />
                            <span>Download .sif</span>
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
          {/* File Selected Attachment Pill */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-mono text-zinc-800 shadow-xs">
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
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
                  {inspectSif.sifVerified ? (
                    <span className="text-[10px] font-bold text-emerald-600">
                      ORIGINAL AUTHOR MATCH
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600">
                      THIRD-PARTY / FORWARDED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-800">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Cipher Suite: AES-256-GCM (0x01)</span>
                </div>
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
    </div>
  );
}
