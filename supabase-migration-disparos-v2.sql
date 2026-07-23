-- ============================================================
-- ATUALIZAÇÃO DISPAROS E CADASTRO DE CLIENTES DE DISPARO
-- Execute no SQL Editor do painel do Supabase
-- ============================================================

-- 1. Modificar restrição de tipo de disparo na tabela cris_tech_disparos
-- Remove check constraints antigas associadas ao tipo se existirem
ALTER TABLE cris_tech_disparos DROP CONSTRAINT IF EXISTS cris_tech_disparos_tipo_check;

-- Adiciona a restrição atualizada incluindo o formato 'imagem'
ALTER TABLE cris_tech_disparos ADD CONSTRAINT cris_tech_disparos_tipo_check 
  CHECK (tipo IN ('texto', 'texto_imagem', 'imagem'));

-- 2. Adicionar coluna 'destinatario' na tabela de disparos
ALTER TABLE cris_tech_disparos ADD COLUMN IF NOT EXISTS destinatario TEXT DEFAULT 'grupo'
  CHECK (destinatario IN ('grupo', 'clientes'));

-- 3. Criar tabela 'cris_tech_clientes_disparo'
CREATE TABLE IF NOT EXISTS cris_tech_clientes_disparo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para clientes_disparo
ALTER TABLE cris_tech_clientes_disparo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados gerenciam clientes disparo" ON cris_tech_clientes_disparo;
CREATE POLICY "Autenticados gerenciam clientes disparo" ON cris_tech_clientes_disparo
  FOR ALL USING (auth.role() = 'authenticated');
