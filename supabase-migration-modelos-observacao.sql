-- 1. Tabela para salvar os modelos de observações
CREATE TABLE IF NOT EXISTS cris_tech_modelos_observacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto TEXT NOT NULL CHECK (char_length(texto) <= 275),
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS (Row Level Security)
ALTER TABLE cris_tech_modelos_observacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem modelos de observacao" ON cris_tech_modelos_observacao
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados criam modelos de observacao" ON cris_tech_modelos_observacao
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Gerenciar proprios modelos" ON cris_tech_modelos_observacao
  FOR UPDATE USING (auth.uid() = criado_por);

CREATE POLICY "Excluir proprios modelos" ON cris_tech_modelos_observacao
  FOR DELETE USING (auth.uid() = criado_por);

-- Políticas para master/admin (opcional, mas recomendado para poderem limpar/editar qualquer um)
CREATE POLICY "Admin master editam qualquer modelo" ON cris_tech_modelos_observacao
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cris_tech_usuarios WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

CREATE POLICY "Admin master excluem qualquer modelo" ON cris_tech_modelos_observacao
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM cris_tech_usuarios WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );
