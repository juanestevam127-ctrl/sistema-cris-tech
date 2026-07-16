-- ============================================================
-- TABELA: Disparos de Mensagens (WhatsApp/Telegram Grupos)
-- Execute este script no SQL Editor do painel do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS cris_tech_disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'texto_imagem')),
  texto TEXT,
  imagem_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' 
    CHECK (status IN ('pendente', 'enviado', 'erro')),
  erro_mensagem TEXT,
  agendado_para TIMESTAMPTZ,
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que a coluna agendado_para exista caso a tabela já tenha sido criada
ALTER TABLE cris_tech_disparos ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ;

-- RLS
ALTER TABLE cris_tech_disparos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados gerenciam disparos" ON cris_tech_disparos;
CREATE POLICY "Autenticados gerenciam disparos" ON cris_tech_disparos
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- CRON JOB: Processamento automático no Supabase
-- ============================================================
-- Habilita as extensões pg_cron e pg_net no Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove o job antigo se existir para evitar erro de duplicidade
SELECT cron.unschedule('processar-disparos-mensagem') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'processar-disparos-mensagem'
);

-- Agenda a execução a cada minuto chamando a nossa rota de API
SELECT cron.schedule(
  'processar-disparos-mensagem',  -- Nome do job
  '* * * * *',                     -- Roda a cada minuto
  $$
  SELECT net.http_get(
    'https://sistema.cristechh.com.br/api/cron/process-dispatches'
  );
  $$
);
