import React from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { SifLogo } from "../icons/Icons";
import { ShieldCheck, LogOut, User as UserIcon } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
            <SifLogo className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-black">SIF Codec</span>
              <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-600">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Secure Image Format Container</p>
          </div>
        </div>

        {/* Center / Security Indicator */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-900" />
          <span>AEAD Rust Codec Engine Active</span>
        </div>

        {/* User & Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 border-r border-zinc-200 pr-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="h-7 w-7 rounded-full border border-zinc-200 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-700">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-zinc-900 leading-none">
                  {user.name || user.email || "Authenticated User"}
                </p>
                {user.email && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 max-w-[140px] truncate">{user.email}</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Sign out"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
