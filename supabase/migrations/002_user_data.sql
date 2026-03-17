-- Dados do app por usuário (contas, transações, objetivos, etc.) em um único JSONB.
-- Execute no SQL Editor do Supabase após 001_profiles_and_check_cpf.sql.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.user_data enable row level security;

create policy "Users can view own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id);
