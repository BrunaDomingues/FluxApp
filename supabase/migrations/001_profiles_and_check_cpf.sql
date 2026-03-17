-- Tabela de perfis (nome, CPF) vinculada ao auth.users.
-- Execute no SQL Editor do seu projeto Supabase (Dashboard > SQL Editor).

-- Tabela profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome_completo text,
  cpf text unique not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

-- Usuário pode ver e atualizar só o próprio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Inserção: apenas o próprio usuário pode inserir seu perfil (id = auth.uid())
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Função para verificar se CPF já existe (usada no cadastro, antes de criar conta).
-- Segurança: retorna apenas true/false, sem expor dados.
create or replace function public.check_cpf_exists(cpf text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where profiles.cpf = check_cpf_exists.cpf);
$$;

-- Permite chamada anônima (para tela de cadastro antes de login)
grant execute on function public.check_cpf_exists(text) to anon;
grant execute on function public.check_cpf_exists(text) to authenticated;
