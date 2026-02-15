-- Políticas de Storage para o bucket cris-tech-images
-- Execute no SQL Editor do Supabase APÓS criar o bucket no painel Storage

-- Se as políticas já existirem, remova-as antes ou use DROP POLICY IF EXISTS
DROP POLICY IF EXISTS "Autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública cris-tech-images" ON storage.objects;

CREATE POLICY "Autenticados podem fazer upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cris-tech-images');

CREATE POLICY "Leitura pública cris-tech-images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'cris-tech-images');
