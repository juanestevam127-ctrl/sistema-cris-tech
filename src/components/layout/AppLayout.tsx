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
        <header className="flex h-14 flex-wrap items-center gap-2 border-b border-[#1E1E1E] bg-[#111111] px-6">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#9CA3AF] hover:text-white lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <Link
            href="/operacao"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === "/operacao"
                ? "bg-[#CC0000] text-white"
                : "text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
              }`}
          >
            Operação
          </Link>
          <Link
            href="/clientes"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith("/clientes")
                ? "bg-[#CC0000] text-white"
                : "text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
              }`}
          >
            Clientes
          </Link>
          <Link
            href="/ordens-de-servico"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith("/ordens-de-servico")
                ? "bg-[#CC0000] text-white"
                : "text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
              }`}
          >
            Ordens de Serviço
          </Link>
          <Link
            href="/orcamentos"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith("/orcamentos")
                ? "bg-[#CC0000] text-white"
                : "text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
              }`}
          >
            Orçamentos
          </Link>
          {showConfig && (
            <Link
              href="/configuracao"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === "/configuracao"
                  ? "bg-[#CC0000] text-white"
                  : "text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                }`}
            >
              Configuração
            </Link>
          )}
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
