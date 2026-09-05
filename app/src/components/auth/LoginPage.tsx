import React from "react";
import { GoogleLogo, SifLogo } from "../icons/Icons";
import { Shield, Lock, Cpu } from "lucide-react";

export const LoginPage: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/api/auth/google";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white">
              <SifLogo className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-black">
              SIF Codec Studio
            </h1>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed max-w-xs">
              Secure Image Format container engine backed by authenticated AEAD encryption.
            </p>
          </div>

          {/* Primary Action: Google Login */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="group flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 shadow-xs cursor-pointer"
            >
              <GoogleLogo className="h-4 w-4" />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Features Specs list */}
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3 text-center">
              Container Specifications
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-600 font-mono">
              <div className="rounded border border-zinc-100 bg-zinc-50 p-2.5">
                <Shield className="mx-auto mb-1 h-3.5 w-3.5 text-zinc-700" />
                <span>AES-256-GCM</span>
              </div>
              <div className="rounded border border-zinc-100 bg-zinc-50 p-2.5">
                <Lock className="mx-auto mb-1 h-3.5 w-3.5 text-zinc-700" />
                <span>SIF1 Header</span>
              </div>
              <div className="rounded border border-zinc-100 bg-zinc-50 p-2.5">
                <Cpu className="mx-auto mb-1 h-3.5 w-3.5 text-zinc-700" />
                <span>Rust Codec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          SIF Codec Testbench • Fully Authenticated & Encrypted
        </p>
      </div>
    </div>
  );
};
