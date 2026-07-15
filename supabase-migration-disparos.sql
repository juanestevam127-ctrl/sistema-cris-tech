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
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE cris_tech_disparos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados gerenciam disparos" ON cris_tech_disparos;
CREATE POLICY "Autenticados gerenciam disparos" ON cris_tech_disparos
  FOR ALL USING (auth.role() = 'authenticated');
