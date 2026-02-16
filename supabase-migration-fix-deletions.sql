-- SCRIPT DE CORREÇÃO DE EXCLUSÕES
-- Execute este script no SQL Editor do Supabase para corrigir os erros de deletar usuários, clientes e orçamentos.

-- 1. CORREGIR REFERÊNCIAS DE USUÁRIOS (SET NULL)
-- Permite deletar um usuário sem deletar os dados que ele criou.

-- Layouts
ALTER TABLE cris_tech_layouts 
  DROP CONSTRAINT IF EXISTS cris_tech_layouts_criado_por_fkey,
  ADD CONSTRAINT cris_tech_layouts_criado_por_fkey 
  FOREIGN KEY (criado_por) REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL;

-- Clientes
ALTER TABLE cris_tech_clientes 
  DROP CONSTRAINT IF EXISTS cris_tech_clientes_criado_por_fkey,
  ADD CONSTRAINT cris_tech_clientes_criado_por_fkey 
  FOREIGN KEY (criado_por) REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL;

-- Ordens de Serviço
ALTER TABLE cris_tech_ordens_servico 
  DROP CONSTRAINT IF EXISTS cris_tech_ordens_servico_tecnico_responsavel_fkey,
  ADD CONSTRAINT cris_tech_ordens_servico_tecnico_responsavel_fkey 
  FOREIGN KEY (tecnico_responsavel) REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS cris_tech_ordens_servico_criado_por_fkey,
  ADD CONSTRAINT cris_tech_ordens_servico_criado_por_fkey 
  FOREIGN KEY (criado_por) REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL;

-- Orçamentos
ALTER TABLE cris_tech_orcamentos 
  DROP CONSTRAINT IF EXISTS cris_tech_orcamentos_criado_por_fkey,
  ADD CONSTRAINT cris_tech_orcamentos_criado_por_fkey 
  FOREIGN KEY (criado_por) REFERENCES cris_tech_usuarios(id) ON DELETE SET NULL;


-- 2. CORREGIR EXCLUSÃO EM CASCATA DE CLIENTES (CASCADE)
-- Permite que ao deletar um cliente, suas OS e Orçamentos também sejam removidos.

-- Ordens de Serviço
ALTER TABLE cris_tech_ordens_servico 
  DROP CONSTRAINT IF EXISTS cris_tech_ordens_servico_cliente_id_fkey,
  ADD CONSTRAINT cris_tech_ordens_servico_cliente_id_fkey 
  FOREIGN KEY (cliente_id) REFERENCES cris_tech_clientes(id) ON DELETE CASCADE;

-- Orçamentos
ALTER TABLE cris_tech_orcamentos 
  DROP CONSTRAINT IF EXISTS cris_tech_orcamentos_cliente_id_fkey,
  ADD CONSTRAINT cris_tech_orcamentos_cliente_id_fkey 
  FOREIGN KEY (cliente_id) REFERENCES cris_tech_clientes(id) ON DELETE CASCADE;


-- 3. SIMPLIFICAR POLÍTICAS RLS PARA EXCLUSÃO
-- Melhora a performance e evita erros de recursão ao deletar.

-- Clientes
DROP POLICY IF EXISTS "master admin excluem clientes" ON cris_tech_clientes;
CREATE POLICY "master admin excluem clientes" ON cris_tech_clientes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- OS
DROP POLICY IF EXISTS "master admin excluem OS" ON cris_tech_ordens_servico;
CREATE POLICY "master admin excluem OS" ON cris_tech_ordens_servico
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- Orçamentos
DROP POLICY IF EXISTS "master admin excluem orcamentos" ON cris_tech_orcamentos;
CREATE POLICY "master admin excluem orcamentos" ON cris_tech_orcamentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- Layouts
DROP POLICY IF EXISTS "master e admin gerenciam layouts" ON cris_tech_layouts;
CREATE POLICY "master e admin gerenciam layouts" ON cris_tech_layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );

-- Campos
DROP POLICY IF EXISTS "master e admin gerenciam campos" ON cris_tech_campos;
CREATE POLICY "master e admin gerenciam campos" ON cris_tech_campos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cris_tech_usuarios 
      WHERE id = auth.uid() AND role IN ('master', 'admin')
    )
  );
