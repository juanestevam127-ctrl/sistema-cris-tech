// types/index.ts

export type UserRole = "master" | "admin" | "user";
export type TipoCampo = "texto" | "imagem" | "checkbox";

export interface CrisTechUsuario {
  id: string;
  email: string;
  nome?: string;
  role: UserRole;
  created_at: string;
}

export interface CrisTechLayout {
  id: string;
  nome: string;
  webhook_url: string;
  descricao?: string;
  criado_por: string;
  created_at: string;
  updated_at: string;
  campos?: CrisTechCampo[];
}

export interface CrisTechCampo {
  id: string;
  layout_id: string;
  nome: string;
  tipo: TipoCampo;
  opcoes?: string; // ex: "Stories,Feed"
  ordem: number;
  obrigatorio: boolean;
  created_at?: string;
}

// Runtime — linha na tabela de Operação (não salva no banco)
export interface LinhaOperacao {
  id: string; // crypto.randomUUID()
  dados: Record<string, string | string[]>;
}

// Módulo Manutenções
export type TipoCliente = "pessoa_fisica" | "pessoa_juridica";

export interface CrisTechCliente {
  id: string;
  nome: string;
  tipo: TipoCliente;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  razao_social?: string;
  nome_fantasia?: string;
  criado_por: string;
  created_at: string;
  updated_at?: string;
}

export interface CrisTechOS {
  id: string;
  numero_os: number;
  data_os: string;
  cliente_id?: string;
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";

  // Dados do cliente (inline)
  cliente_nome: string;
  cliente_endereco_completo: string;
  cliente_cidade: string;
  cliente_estado: string;
  cliente_cpf_cnpj: string;
  cliente_email?: string;
  cliente_telefone?: string;

  // Observações (máx 275 chars)
  observacoes?: string;

  // Garantia
  garantia_meses: number;
  data_vencimento_garantia?: string;

  // Valores
  taxa_visita: number;
  valor_total: number;

  // Imagem da OS (Renderform)
  imagem_os_url?: string;
  imagem_os_status: "pendente" | "gerando" | "concluida" | "erro";

  // Relação
  materiais?: CrisTechOSMaterial[];

  // Controle
  criado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface CrisTechOSMaterial {
  id: string;
  os_id: string;
  tipo: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
}

export type StatusOrcamento =
  | "pendente"
  | "aprovado"
  | "recusado"
  | "expirado";

export interface CrisTechOrcamento {
  id: string;
  numero_orcamento: number;
  cliente_id: string;
  cliente?: CrisTechCliente;
  status: StatusOrcamento;
  data_emissao: string;
  data_validade?: string;
  descricao?: string;
  observacoes?: string;

  // Snapshot do cliente
  cliente_nome?: string;
  cliente_endereco_completo?: string;
  cliente_cidade?: string;
  cliente_estado?: string;
  cliente_cpf_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;

  // Imagem do Orçamento (Renderform)
  imagem_orc_url?: string;
  imagem_orc_status?: "pendente" | "gerando" | "concluida" | "erro";

  criado_por?: string;
  created_at: string;
  itens?: CrisTechOrcamentoItem[];
  fotos?: CrisTechOrcamentoFoto[];
}

export interface CrisTechOrcamentoItem {
  id: string;
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
}

export interface CrisTechOrcamentoFoto {
  id: string;
  orcamento_id: string;
  url: string;
  descricao?: string;
}
