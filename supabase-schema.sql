-- Cris Tech - Schema do banco de dados Supabase
-- Execute no SQL Editor do painel Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS cris_tech_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('master', 'admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de layouts
CREATE TABLE IF NOT EXISTS cris_tech_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  descricao TEXT,
  criado_por UUID REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de campos
CREATE TABLE IF NOT EXISTS cris_tech_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES cris_tech_layouts(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'imagem', 'checkbox')),
  opcoes TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS - Layouts
ALTER TABLE cris_tech_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem layouts" ON cris_tech_layouts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "master e admin gerenciam layouts" ON cris_tech_layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- RLS - Campos
ALTER TABLE cris_tech_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem campos" ON cris_tech_campos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "master e admin gerenciam campos" ON cris_tech_campos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- RLS - Usuários
ALTER TABLE cris_tech_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem usuarios" ON cris_tech_usuarios
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Somente master gerencia usuarios" ON cris_tech_usuarios
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM cris_tech_usuarios WHERE role = 'master')
  );

-- ===========================================
-- STORAGE - Execute APÓS criar o bucket
-- ===========================================
-- 1. Painel Supabase → Storage → New bucket
--    Nome: cris-tech-images | Público: Sim
--
-- 2. Depois execute as políticas abaixo:

CREATE POLICY "Autenticados podem fazer upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cris-tech-images');

CREATE POLICY "Leitura pública cris-tech-images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'cris-tech-images');
