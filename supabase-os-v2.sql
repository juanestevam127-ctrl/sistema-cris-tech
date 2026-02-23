-- ============================================================
-- OS v2.1 — MIGRAÇÃO COMPLETA
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Remover tabelas não utilizadas
DROP TABLE IF EXISTS cris_tech_os_fotos CASCADE;
DROP TABLE IF EXISTS cris_tech_clientes CASCADE;

-- 2. Dropar tabela antiga de OS (e depedências)
DROP TABLE IF EXISTS cris_tech_os_materiais CASCADE;
DROP TABLE IF EXISTS cris_tech_ordens_servico CASCADE;

-- 3. Remover funções antigas se existirem
DROP FUNCTION IF EXISTS fn_calcular_material CASCADE;
DROP FUNCTION IF EXISTS fn_calcular_os_v2 CASCADE;
DROP FUNCTION IF EXISTS fn_atualizar_total_os CASCADE;

-- ============================================================
-- TABELA PRINCIPAL: Ordens de Serviço
-- ============================================================
CREATE TABLE cris_tech_ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os SERIAL UNIQUE,

  -- Data da OS
  data_os DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Dados do Cliente (inline, sem tabela separada)
  cliente_nome TEXT NOT NULL,
  cliente_endereco_completo TEXT NOT NULL,
  cliente_cidade TEXT NOT NULL,
  cliente_estado TEXT NOT NULL,
  cliente_cpf_cnpj TEXT NOT NULL,
  cliente_email TEXT,
  cliente_telefone TEXT,

  -- Observações (máximo 275 caracteres)
  observacoes TEXT CHECK (char_length(observacoes) <= 275),

  -- Garantia
  garantia_meses INTEGER DEFAULT 0,
  data_vencimento_garantia DATE,

  -- Valores
  taxa_visita NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,

  -- Imagem da OS gerada (Renderform)
  imagem_os_url TEXT,
  imagem_os_status TEXT DEFAULT 'pendente'
    CHECK (imagem_os_status IN ('pendente', 'gerando', 'concluida', 'erro')),

  -- Controle
  criado_por UUID REFERENCES cris_tech_usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: Materiais Utilizados (máximo 5 por OS)
-- ============================================================
CREATE TABLE cris_tech_os_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES cris_tech_ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT ordem_1_a_5 CHECK (ordem >= 1 AND ordem <= 5)
);

-- ============================================================
-- TRIGGER: Calcular valor_total de cada material
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_material()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_total := NEW.quantidade * NEW.valor_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_material
BEFORE INSERT OR UPDATE ON cris_tech_os_materiais
FOR EACH ROW EXECUTE FUNCTION fn_calcular_material();

-- ============================================================
-- TRIGGER: Calcular valor_total da OS e data de vencimento garantia
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_os_v2()
RETURNS TRIGGER AS $$
DECLARE
  soma_materiais NUMERIC(10,2);
BEGIN
  SELECT COALESCE(SUM(valor_total), 0) INTO soma_materiais
  FROM cris_tech_os_materiais
  WHERE os_id = NEW.id;

  NEW.valor_total := soma_materiais + COALESCE(NEW.taxa_visita, 0);

  IF NEW.garantia_meses > 0 AND NEW.data_os IS NOT NULL THEN
    NEW.data_vencimento_garantia := NEW.data_os + (NEW.garantia_meses * INTERVAL '1 month');
  ELSE
    NEW.data_vencimento_garantia := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_os_v2
BEFORE INSERT OR UPDATE ON cris_tech_ordens_servico
FOR EACH ROW EXECUTE FUNCTION fn_calcular_os_v2();

-- ============================================================
-- TRIGGER: Recalcular valor_total da OS quando materiais mudarem
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualizar_total_os()
RETURNS TRIGGER AS $$
DECLARE
  soma_materiais NUMERIC(10,2);
  os_taxa_visita NUMERIC(10,2);
BEGIN
  SELECT COALESCE(SUM(valor_total), 0) INTO soma_materiais
  FROM cris_tech_os_materiais
  WHERE os_id = COALESCE(NEW.os_id, OLD.os_id);

  SELECT COALESCE(taxa_visita, 0) INTO os_taxa_visita
  FROM cris_tech_ordens_servico
  WHERE id = COALESCE(NEW.os_id, OLD.os_id);

  UPDATE cris_tech_ordens_servico
  SET valor_total = soma_materiais + os_taxa_visita,
      updated_at = now()
  WHERE id = COALESCE(NEW.os_id, OLD.os_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_total_os_insert
AFTER INSERT ON cris_tech_os_materiais
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_total_os();

CREATE TRIGGER trg_atualizar_total_os_update
AFTER UPDATE ON cris_tech_os_materiais
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_total_os();

CREATE TRIGGER trg_atualizar_total_os_delete
AFTER DELETE ON cris_tech_os_materiais
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_total_os();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE cris_tech_ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cris_tech_os_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem OS" ON cris_tech_ordens_servico
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados criam OS" ON cris_tech_ordens_servico
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados editam OS" ON cris_tech_ordens_servico
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "master e admin excluem OS" ON cris_tech_ordens_servico
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM cris_tech_usuarios WHERE role IN ('master', 'admin'))
  );

CREATE POLICY "Autenticados gerenciam materiais" ON cris_tech_os_materiais
  FOR ALL USING (auth.role() = 'authenticated');
