"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, ArrowLeft, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const actionParam = searchParams.get("action") || "approve";
  
  const [loading, setLoading] = useState<boolean>(Boolean(token));
  const [status, setStatus] = useState<string>(searchParams.get("status") || "approved");
  const [imageUuid, setImageUuid] = useState<string>(searchParams.get("uuid") || "");
  const [sender, setSender] = useState<string>(searchParams.get("sender") || "the forwarder");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function processVerification() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/verify?token=${encodeURIComponent(token!)}&action=${encodeURIComponent(actionParam)}`,
          { headers: { accept: "application/json" } }
        );
        const data = await res.json();

        if (isMounted) {
          if (res.ok && data.success) {
            setStatus(data.status === "REJECTED" ? "rejected" : "approved");
            setImageUuid(data.imageUuid || "");
            setSender(data.senderName || "the forwarder");
          } else {
            setErrorMessage(data.error || "Failed to process verification request.");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Network error during verification";
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void processVerification();
    return () => {
      isMounted = false;
    };
  }, [token, actionParam]);

  const isApproved = status === "approved" || status === "VERIFIED";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl text-center space-y-4">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-black" />
          <h2 className="text-sm font-bold">Verifying Container Authorization...</h2>
          <p className="text-xs text-zinc-500">Communicating with SIF Zero-DB Gate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl text-center space-y-6">
        {/* Header Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
          {errorMessage ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
              <ShieldAlert className="h-7 w-7" />
            </div>
          ) : isApproved ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
              <CheckCircle className="h-7 w-7" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md">
              <XCircle className="h-7 w-7" />
            </div>
          )}
        </div>

        {/* Title & Status Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium">
            {errorMessage ? (
              <span className="flex items-center gap-1 text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" /> TOKEN ERROR
              </span>
            ) : isApproved ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> SIF AUTHORIZED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-700">
                <ShieldAlert className="h-3.5 w-3.5" /> SIF TRANSFER REJECTED
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {errorMessage
              ? "Verification Issue"
              : isApproved
              ? "Container Released to Chat"
              : "Container Transfer Blocked"}
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {errorMessage
              ? errorMessage
              : isApproved
              ? `You have cryptographically authorized ${sender} to share your .sif container in SIF Secure Chat.`
              : `You have declined permission. The container remains locked and will not be displayed to users.`}
          </p>
        </div>

        {/* Container UUID Metadata */}
        {imageUuid && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-left font-mono text-xs space-y-1">
            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
              Authenticated Container UUID
            </span>
            <span className="text-zinc-800 break-all font-bold block">{imageUuid}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to SIF Secure Chat</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono">
          <Lock className="h-3 w-3" />
          <span>Zero-DB Provenance & Access Control Gate</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-mono text-xs text-zinc-500">
          Loading verification status...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
