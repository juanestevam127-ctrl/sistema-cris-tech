"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { CrisTechCliente, TipoCliente } from "@/types";
import { formatCpfCnpj, formatPhone, formatCep } from "@/lib/utils";

interface ModalClienteProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: CrisTechCliente | null;
  onSuccess: () => void;
}

export function ModalCliente({
  isOpen,
  onClose,
  cliente,
  onSuccess,
}: ModalClienteProps) {
  const { usuario } = useAuth();
  const [tipo, setTipo] = useState<TipoCliente>("pessoa_fisica");
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [celular, setCelular] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (cliente) {
      setTipo(cliente.tipo);
      setNome(cliente.nome);
      setCpfCnpj(cliente.cpf_cnpj ?? "");
      setRazaoSocial(cliente.razao_social ?? "");
      setNomeFantasia(cliente.nome_fantasia ?? "");
      setEmail(cliente.email ?? "");
      setTelefone(cliente.telefone ?? "");
      setCelular(cliente.celular ?? "");
      setCep(cliente.cep ?? "");
      setEndereco(cliente.endereco ?? "");
      setNumero(cliente.numero ?? "");
      setComplemento(cliente.complemento ?? "");
      setBairro(cliente.bairro ?? "");
      setCidade(cliente.cidade ?? "");
      setEstado(cliente.estado ?? "");
      setObservacoes(cliente.observacoes ?? "");
    } else {
      setTipo("pessoa_fisica");
      setNome("");
      setCpfCnpj("");
      setRazaoSocial("");
      setNomeFantasia("");
      setEmail("");
      setTelefone("");
      setCelular("");
      setCep("");
      setEndereco("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setObservacoes("");
    }
  }, [isOpen, cliente]);

  const buscarCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
      } else {
        setEndereco(data.logradouro ?? "");
        setBairro(data.bairro ?? "");
        setCidade(data.localidade ?? "");
        setEstado(data.uf ?? "");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const salvar = async () => {
    const nomeVal = tipo === "pessoa_fisica" ? nome.trim() : razaoSocial.trim();
    if (!nomeVal) {
      toast.error("Nome ou Razão Social é obrigatório.");
      return;
    }
    if (!celular.trim()) {
      toast.error("Celular é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: tipo === "pessoa_fisica" ? nome.trim() : nomeFantasia.trim() || razaoSocial.trim(),
        tipo,
        cpf_cnpj: cpfCnpj.replace(/\D/g, "") || null,
        razao_social: tipo === "pessoa_juridica" ? razaoSocial.trim() || null : null,
        nome_fantasia: tipo === "pessoa_juridica" ? nomeFantasia.trim() || null : null,
        email: email.trim() || null,
        telefone: telefone.replace(/\D/g, "") || null,
        celular: celular.replace(/\D/g, "") || null,
        cep: cep.replace(/\D/g, "") || null,
        endereco: endereco.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        observacoes: observacoes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (cliente) {
        const { error } = await supabase
          .from("cris_tech_clientes")
          .update(payload)
          .eq("id", cliente.id);
        if (error) throw error;
        toast.success("Cliente atualizado!");
      } else {
        const { error } = await supabase
          .from("cris_tech_clientes")
          .insert({
            ...payload,
            criado_por: usuario?.id,
          });
        if (error) throw error;
        toast.success("Cliente cadastrado!");
      }
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente ? "Editar Cliente" : "Novo Cliente"}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            TIPO DE CADASTRO *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo("pessoa_fisica")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                tipo === "pessoa_fisica"
                  ? "border-[#CC0000] bg-[#CC0000]/20 text-white"
                  : "border-[#1E1E1E] text-[#9CA3AF] hover:bg-[#1E1E1E]"
              }`}
            >
              Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => setTipo("pessoa_juridica")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                tipo === "pessoa_juridica"
                  ? "border-[#CC0000] bg-[#CC0000]/20 text-white"
                  : "border-[#1E1E1E] text-[#9CA3AF] hover:bg-[#1E1E1E]"
              }`}
            >
              Pessoa Jurídica
            </button>
          </div>
        </div>

        {tipo === "pessoa_fisica" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
                NOME COMPLETO *
              </label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CPF</label>
              <Input
                value={formatCpfCnpj(cpfCnpj)}
                onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ""))}
                placeholder="000.000.000-00"
              />
            </div>
          </>
        )}

        {tipo === "pessoa_juridica" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
                RAZÃO SOCIAL *
              </label>
              <Input
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CNPJ</label>
              <Input
                value={formatCpfCnpj(cpfCnpj)}
                onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ""))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
                NOME FANTASIA
              </label>
              <Input
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">EMAIL</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">TELEFONE</label>
          <Input
            value={formatPhone(telefone)}
            onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
            placeholder="(00) 0000-0000"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CELULAR *</label>
          <Input
            value={formatPhone(celular)}
            onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CEP</label>
          <div className="flex gap-2">
            <Input
              value={formatCep(cep)}
              onChange={(e) => setCep(e.target.value.replace(/\D/g, ""))}
              onBlur={buscarCep}
              placeholder="00000-000"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={buscarCep}
              loading={buscandoCep}
            >
              Buscar
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">ENDEREÇO</label>
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">NÚMERO</label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">COMPLEMENTO</label>
            <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">BAIRRO</label>
          <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CIDADE</label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">ESTADO</label>
            <Input value={estado} onChange={(e) => setEstado(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">OBSERVAÇÕES</label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} loading={salvando}>
            Salvar Cliente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
