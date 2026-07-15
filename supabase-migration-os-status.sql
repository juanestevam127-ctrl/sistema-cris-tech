-- ============================================================
-- ATUALIZAÇÃO DO STATUS E GARANTIA DAS ORDENS DE SERVIÇO (OS)
-- Execute este script no SQL Editor do painel do Supabase
-- ============================================================

-- 1. Remove qualquer restrição antiga de status da tabela de OS
ALTER TABLE cris_tech_ordens_servico DROP CONSTRAINT IF EXISTS status_check;
ALTER TABLE cris_tech_ordens_servico DROP CONSTRAINT IF EXISTS cris_tech_ordens_servico_status_check;

-- 2. Adiciona a nova restrição permitindo os novos status solicitados
ALTER TABLE cris_tech_ordens_servico ADD CONSTRAINT cris_tech_ordens_servico_status_check 
  CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'expirada', 'recusado', 'sem_garantia'));

-- 3. Atualiza a trigger da OS para calcular a garantia dinamicamente quando a OS for concluída
CREATE OR REPLACE FUNCTION fn_calcular_os_v2()
RETURNS TRIGGER AS $$
DECLARE
  soma_materiais NUMERIC(10,2);
BEGIN
  -- Calcula a soma dos materiais da OS
  SELECT COALESCE(SUM(valor_total), 0) INTO soma_materiais
  FROM cris_tech_os_materiais
  WHERE os_id = NEW.id;

  NEW.valor_total := soma_materiais + COALESCE(NEW.taxa_visita, 0);

  -- Regras inteligentes para data de vencimento da garantia
  IF NEW.status = 'concluida' THEN
    -- Se acabou de mudar para concluída e tem meses de garantia, começa a contar a partir de hoje
    IF (OLD.status IS NULL OR OLD.status <> 'concluida') AND NEW.garantia_meses > 0 THEN
      NEW.data_vencimento_garantia := CURRENT_DATE + (NEW.garantia_meses * INTERVAL '1 month');
    END IF;
  ELSIF NEW.status = 'sem_garantia' OR NEW.status = 'recusado' THEN
    NEW.data_vencimento_garantia := NULL;
    NEW.garantia_meses := 0;
  ELSIF NEW.garantia_meses > 0 AND NEW.data_os IS NOT NULL THEN
    -- Se estiver em outro status mas tiver garantia definida, calcula com base na data da OS
    NEW.data_vencimento_garantia := NEW.data_os + (NEW.garantia_meses * INTERVAL '1 month');
  ELSE
    NEW.data_vencimento_garantia := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
