-- SCRIPT DE AJUSTE PARA CONVERSÃO DE OS
-- Execute no SQL Editor do Supabase

-- 1. Garantir que as colunas snapshot existem na OS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='data_os') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN data_os DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_nome') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_nome TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_endereco_completo') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_endereco_completo TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_cidade') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_cidade TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_estado') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_estado TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='cliente_cpf_cnpj') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN cliente_cpf_cnpj TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cris_tech_ordens_servico' AND column_name='taxa_visita') THEN
    ALTER TABLE cris_tech_ordens_servico ADD COLUMN taxa_visita NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- 2. Corrigir o limite de itens (materiais) se necessário
-- Remove a restrição antiga e adiciona uma mais flexível ou apenas garante que a de 5 existe
ALTER TABLE cris_tech_os_materiais DROP CONSTRAINT IF EXISTS ordem_1_a_5;
ALTER TABLE cris_tech_os_materiais ADD CONSTRAINT ordem_1_a_10 CHECK (ordem >= 1 AND ordem <= 10);

-- 3. Sincronizar a sequência de número da OS
-- Isso evita erro de "duplicate key" se a sequência estiver dessincronizada
SELECT setval(
  pg_get_serial_sequence('cris_tech_ordens_servico', 'numero_os'),
  COALESCE((SELECT MAX(numero_os) FROM cris_tech_ordens_servico), 0) + 1,
  false
);

-- 4. Garantir permissões de INSERT para todos autenticados
DROP POLICY IF EXISTS "Autenticados criam OS" ON cris_tech_ordens_servico;
CREATE POLICY "Autenticados criam OS" ON cris_tech_ordens_servico
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados gerenciam materiais" ON cris_tech_os_materiais;
CREATE POLICY "Autenticados gerenciam materiais" ON cris_tech_os_materiais
  FOR ALL USING (auth.role() = 'authenticated');
