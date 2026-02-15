-- Cris Tech - Módulo de Gestão de Manutenções
-- Execute no SQL Editor do Supabase

-- Clientes
CREATE TABLE IF NOT EXISTS cris_tech_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'pessoa_fisica'
    CHECK (tipo IN ('pessoa_fisica', 'pessoa_juridica')),
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  criado_por UUID REFERENCES cris_tech_usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ordens de Serviço
CREATE TABLE IF NOT EXISTS cris_tech_ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os INTEGER UNIQUE,
  cliente_id UUID NOT NULL REFERENCES cris_tech_clientes(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL DEFAULT 'manutencao'
    CHECK (tipo IN ('manutencao', 'venda_equipamento', 'instalacao', 'outros')),
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada')),
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  descricao_problema TEXT,
  servicos_realizados TEXT,
  pecas_utilizadas TEXT,
  valor_servico NUMERIC(10,2) DEFAULT 0,
  valor_pecas NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  garantia_meses INTEGER DEFAULT 0,
  data_vencimento_garantia DATE,
  observacoes TEXT,
  tecnico_responsavel UUID REFERENCES cris_tech_usuarios(id),
  criado_por UUID REFERENCES cris_tech_usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS cris_tech_ordens_servico_numero_seq;
ALTER TABLE cris_tech_ordens_servico
  ALTER COLUMN numero_os SET DEFAULT nextval('cris_tech_ordens_servico_numero_seq');

-- Fotos da OS
CREATE TABLE IF NOT EXISTS cris_tech_os_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES cris_tech_ordens_servico(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'antes'
    CHECK (tipo IN ('antes', 'depois', 'equipamento', 'outros')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orçamentos
CREATE TABLE IF NOT EXISTS cris_tech_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orcamento INTEGER UNIQUE,
  cliente_id UUID NOT NULL REFERENCES cris_tech_clientes(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'recusado', 'expirado')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  descricao TEXT,
  observacoes TEXT,
  criado_por UUID REFERENCES cris_tech_usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS cris_tech_orcamentos_numero_seq;
ALTER TABLE cris_tech_orcamentos
  ALTER COLUMN numero_orcamento SET DEFAULT nextval('cris_tech_orcamentos_numero_seq');

-- Itens do Orçamento
CREATE TABLE IF NOT EXISTS cris_tech_orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES cris_tech_orcamentos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  ordem INTEGER DEFAULT 0
);

-- Fotos do Orçamento
CREATE TABLE IF NOT EXISTS cris_tech_orcamento_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES cris_tech_orcamentos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE cris_tech_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem clientes" ON cris_tech_clientes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam clientes" ON cris_tech_clientes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados editam clientes" ON cris_tech_clientes
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "master admin excluem clientes" ON cris_tech_clientes
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM cris_tech_usuarios WHERE role IN ('master','admin'))
  );

ALTER TABLE cris_tech_ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem OS" ON cris_tech_ordens_servico
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam OS" ON cris_tech_ordens_servico
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados editam OS" ON cris_tech_ordens_servico
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "master admin excluem OS" ON cris_tech_ordens_servico
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM cris_tech_usuarios WHERE role IN ('master','admin'))
  );

ALTER TABLE cris_tech_os_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados fotos OS" ON cris_tech_os_fotos
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE cris_tech_orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem orcamentos" ON cris_tech_orcamentos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam orcamentos" ON cris_tech_orcamentos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados editam orcamentos" ON cris_tech_orcamentos
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "master admin excluem orcamentos" ON cris_tech_orcamentos
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM cris_tech_usuarios WHERE role IN ('master','admin'))
  );

ALTER TABLE cris_tech_orcamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados itens orc" ON cris_tech_orcamento_itens
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE cris_tech_orcamento_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados fotos orc" ON cris_tech_orcamento_fotos
  FOR ALL USING (auth.role() = 'authenticated');
