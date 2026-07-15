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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE cris_tech_postagens_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam postagens" ON cris_tech_postagens_agendadas
  FOR ALL USING (auth.role() = 'authenticated');
