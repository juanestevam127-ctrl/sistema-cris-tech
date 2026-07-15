-- ============================================================
-- TABELA: Postagens Agendadas (Instagram)
-- ============================================================
CREATE TABLE IF NOT EXISTS cris_tech_postagens_agendadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_publicacao TEXT NOT NULL CHECK (tipo_publicacao IN ('feed', 'stories')),
  tipo_midia TEXT NOT NULL,
  legenda TEXT,
  midias TEXT[] NOT NULL,
  agendado_para TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'concluido', 'erro')),
  erro_mensagem TEXT,
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  capa_reels TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que a coluna capa_reels exista se a tabela já foi criada anteriormente
ALTER TABLE cris_tech_postagens_agendadas ADD COLUMN IF NOT EXISTS capa_reels TEXT;

-- RLS
ALTER TABLE cris_tech_postagens_agendadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados gerenciam postagens" ON cris_tech_postagens_agendadas;
CREATE POLICY "Autenticados gerenciam postagens" ON cris_tech_postagens_agendadas
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- CRON JOB: Execução automática no Supabase
-- ============================================================
-- Habilita as extensões pg_cron e pg_net no Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove o job antigo se existir para evitar erro de duplicidade
SELECT cron.unschedule('processar-postagens-instagram') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'processar-postagens-instagram'
);

-- Agenda a execução a cada minuto chamando a nossa rota de API
SELECT cron.schedule(
  'processar-postagens-instagram', -- Nome do job
  '* * * * *',                       -- Roda a cada minuto
  $$
  SELECT net.http_get(
    'https://sistema.cristechh.com.br/api/cron/process-posts'
  );
  $$
);

-- ============================================================
-- FIX: Correção de Recursão Infinita em cris_tech_usuarios
-- ============================================================
-- Remove a política antiga do tipo ALL que causava loops nas consultas
DROP POLICY IF EXISTS "Somente master gerencia usuarios" ON cris_tech_usuarios;
DROP POLICY IF EXISTS "Somente master gerencia usuarios insert" ON cris_tech_usuarios;
DROP POLICY IF EXISTS "Somente master gerencia usuarios update" ON cris_tech_usuarios;
DROP POLICY IF EXISTS "Somente master gerencia usuarios delete" ON cris_tech_usuarios;

-- Cria políticas específicas para gravação separadas do SELECT, evitando loops de recursão
CREATE POLICY "Somente master gerencia usuarios insert" ON cris_tech_usuarios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Somente master gerencia usuarios update" ON cris_tech_usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Somente master gerencia usuarios delete" ON cris_tech_usuarios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role = 'master'
    )
  );
