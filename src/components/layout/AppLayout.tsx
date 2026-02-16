"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showConfig = usuario?.role === "master" || usuario?.role === "admin";

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col">
        {/* Header - simplified and mobile-only */}
        <header className="flex h-14 items-center border-b border-[#1E1E1E] bg-[#111111] px-6 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#9CA3AF] hover:text-white"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-semibold text-white">Cris Tech</span>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
