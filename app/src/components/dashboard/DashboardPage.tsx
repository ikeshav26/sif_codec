import React from "react";
import { Navbar } from "../layout/Navbar";
import { UploadPanel } from "../upload/UploadPanel";
import { VaultPanel } from "../vault/VaultPanel";
import { HeaderInspectModal } from "../vault/HeaderInspectModal";
import { DecryptPreviewModal } from "../vault/DecryptPreviewModal";

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* 30% / 70% Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start h-full">
          {/* Left 30% Panel: Upload & Encode Studio */}
          <div className="lg:col-span-3 h-full">
            <UploadPanel />
          </div>

          {/* Right 70% Panel: Secured SIF Vault */}
          <div className="lg:col-span-7 h-full">
            <VaultPanel />
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <HeaderInspectModal />
      <DecryptPreviewModal />
    </div>
  );
};
