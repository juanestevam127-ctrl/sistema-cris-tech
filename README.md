# Cris Tech - SaaS Gerador de Imagens

Sistema de gerenciamento e geração de artes/imagens com layouts dinâmicos.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + Poppins
- Supabase (Auth + PostgreSQL + Storage)
- Lucide React + React Hot Toast

## Setup

### 1. Dependências

```bash
npm install
```

### 2. Variáveis de ambiente

O arquivo `.env.local` já deve conter:

```env
NEXT_PUBLIC_SUPABASE_URL=https://arxaqnwuyesmjcsyfmbj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave>
NEXT_PUBLIC_SUPABASE_BUCKET=cris-tech-images
```

> ⚠️ A chave fornecida é `service_role`. Para produção, use `SUPABASE_SERVICE_ROLE_KEY` separada e mantenha `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave anônima.

### 3. Banco de dados Supabase

Execute o arquivo `supabase-schema.sql` no SQL Editor do painel Supabase para criar as tabelas e RLS.

### 4. Storage

No painel Supabase → Storage, crie o bucket `cris-tech-images` como **público**.

### 5. Seed do admin master

1. Authentication → Users → Add User:
   - Email: `juanestevam19@outlook.com`
   - Senha: `Juan19022003@#`
   - Marcar "Auto Confirm User"

2. Copie o UUID do usuário e execute no SQL Editor:

```sql
INSERT INTO cris_tech_usuarios (id, email, nome, role)
VALUES (
  '<UUID_DO_AUTH>',
  'juanestevam19@outlook.com',
  'Juan Estevam',
  'master'
);
```

### 6. Rodar o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Funcionalidades

- **Login**: Autenticação via Supabase + verificação em `cris_tech_usuarios`
- **Operação**: Seleção de layout, tabela dinâmica com textos, imagens e checkboxes, envio para webhook
- **Configuração** (master/admin): CRUD de layouts
- **Usuários** (somente master): Criar e excluir usuários (Comum ou Admin)
