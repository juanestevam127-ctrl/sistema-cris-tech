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

export type StatusOS =
  | "aberta"
  | "em_andamento"
  | "aguardando_pecas"
  | "concluida"
  | "cancelada";

export type TipoOS =
  | "manutencao"
  | "venda_equipamento"
  | "instalacao"
  | "outros";

export interface CrisTechOS {
  id: string;
  numero_os: number;
  cliente_id: string;
  cliente?: CrisTechCliente;
  tipo: TipoOS;
  status: StatusOS;
  data_abertura: string;
  data_conclusao?: string;
  descricao_problema?: string;
  servicos_realizados?: string;
  pecas_utilizadas?: string;
  valor_servico: number;
  valor_pecas: number;
  valor_total: number;
  garantia_meses: number;
  data_vencimento_garantia?: string;
  observacoes?: string;
  tecnico_responsavel?: string;
  tecnico?: CrisTechUsuario;
  criado_por?: string;
  created_at: string;
  fotos?: CrisTechOSFoto[];
}

export interface CrisTechOSFoto {
  id: string;
  os_id: string;
  url: string;
  descricao?: string;
  tipo: "antes" | "depois" | "equipamento" | "outros";
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
