"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Image, Users, Wrench, FileText, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, signOut } = useAuth();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "master":
        return "MASTER";
      case "admin":
        return "ADMIN";
      default:
        return "COMMON";
    }
  };

  const showConfig = usuario?.role === "master" || usuario?.role === "admin";

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-[#1E1E1E] bg-[#111111]">
      <div className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC0000] text-sm font-bold text-white">
          CT
        </div>
        <span className="font-semibold text-white">Cris Tech</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <Link
          href="/operacao"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1E1E1E] hover:text-white ${
            pathname === "/operacao"
              ? "bg-[#A30000] text-white hover:bg-[#A30000]"
              : ""
          }`}
        >
          <Image size={20} />
          Gerenciar Imagens
        </Link>
        <Link
          href="/clientes"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1E1E1E] hover:text-white ${
            pathname.startsWith("/clientes")
              ? "bg-[#A30000] text-white hover:bg-[#A30000]"
              : ""
          }`}
        >
          <Users size={20} />
          Clientes
        </Link>
        <Link
          href="/ordens-de-servico"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1E1E1E] hover:text-white ${
            pathname.startsWith("/ordens-de-servico")
              ? "bg-[#A30000] text-white hover:bg-[#A30000]"
              : ""
          }`}
        >
          <Wrench size={20} />
          Ordens de Serviço
        </Link>
        <Link
          href="/orcamentos"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1E1E1E] hover:text-white ${
            pathname.startsWith("/orcamentos")
              ? "bg-[#A30000] text-white hover:bg-[#A30000]"
              : ""
          }`}
        >
          <FileText size={20} />
          Orçamentos
        </Link>
        {showConfig && (
          <Link
            href="/configuracao"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1E1E1E] hover:text-white ${
              pathname === "/configuracao"
                ? "bg-[#A30000] text-white hover:bg-[#A30000]"
                : ""
            }`}
          >
            <Settings size={20} />
            Configuração
          </Link>
        )}
      </nav>
      <div className="border-t border-[#1E1E1E] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-sm font-medium text-white">
            {usuario?.nome?.[0]?.toUpperCase() ?? usuario?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {usuario?.nome || usuario?.email}
            </p>
            <p className="truncate text-xs text-[#9CA3AF]">
              {usuario?.email}
            </p>
            <span className="text-xs font-medium text-[#CC0000]">
              {usuario && getRoleLabel(usuario.role)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={signOut}
        >
          <LogOut size={18} />
          Sair
        </Button>
      </div>
    </aside>
  );
}
