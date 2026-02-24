-- Adicionar colunas de snapshot do cliente e tracking de imagem nos Orçamentos
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_endereco_completo TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_cidade TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_estado TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_cpf_cnpj TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_email TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS cliente_telefone TEXT;

ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS imagem_orc_url TEXT;
ALTER TABLE cris_tech_orcamentos ADD COLUMN IF NOT EXISTS imagem_orc_status TEXT DEFAULT 'pendente' 
  CHECK (imagem_orc_status IN ('pendente', 'gerando', 'concluida', 'erro'));
