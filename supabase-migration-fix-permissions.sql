-- Migração para remover restrição de role master/admin na exclusão de OS e Orçamentos
-- Execute no SQL Editor do Supabase

-- 0. Garantir que as colunas necessárias existam na OS
DO $$ 
BEGIN 
  -- Coluna cliente_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_id') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_id UUID REFERENCES cris_tech_clientes(id) ON DELETE SET NULL;
  END IF;

  -- Coluna status (garantindo valores corretos)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='status') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN status TEXT DEFAULT 'aberta';
  END IF;
END $$;

-- 1. Ordens de Serviço
DROP POLICY IF EXISTS "master admin excluem OS" ON cris_tech_ordens_servico;
DROP POLICY IF EXISTS "master e admin excluem OS" ON cris_tech_ordens_servico;
DROP POLICY IF EXISTS "Autenticados excluem OS" ON cris_tech_ordens_servico;

CREATE POLICY "Autenticados excluem OS" ON cris_tech_ordens_servico
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Orçamentos
DROP POLICY IF EXISTS "master admin excluem orcamentos" ON cris_tech_orcamentos;
DROP POLICY IF EXISTS "Autenticados excluem orcamentos" ON cris_tech_orcamentos;

CREATE POLICY "Autenticados excluem orcamentos" ON cris_tech_orcamentos
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Clientes
DROP POLICY IF EXISTS "master admin excluem clientes" ON cris_tech_clientes;
DROP POLICY IF EXISTS "Autenticados excluem clientes" ON cris_tech_clientes;

CREATE POLICY "Autenticados excluem clientes" ON cris_tech_clientes
  FOR DELETE USING (auth.role() = 'authenticated');
