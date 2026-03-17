-- Usuários convidados (para dividir despesa) que ainda não criaram senha.
-- Quem convida cria o registro; o convidado completa o cadastro em "Criar conta" só com senha.
-- Execute no SQL Editor após 001 e 002.

create table if not exists public.pending_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  cpf text not null,
  nome_completo text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  password_created boolean not null default false
);

create index if not exists idx_pending_users_email on public.pending_users(email);
create index if not exists idx_pending_users_password_created on public.pending_users(password_created);

alter table public.pending_users enable row level security;

-- Quem está logado pode inserir (convidar)
create policy "Authenticated can insert pending"
  on public.pending_users for insert
  to authenticated
  with check (auth.uid() = invited_by);

-- Qualquer um pode ver se existe pendência por email/cpf (para tela de criar conta)
create policy "Anyone can select pending for signup check"
  on public.pending_users for select
  using (true);

-- Só o próprio usuário (após login) pode marcar password_created (via RPC)
-- Não expor update direto; usar RPC complete_pending_signup

-- Verifica se existe convite pendente para este email+cpf (ainda sem senha).
-- Retorna { found: boolean, nome_completo: text }.
create or replace function public.check_pending_signup(p_email text, p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  p_cpf_clean text;
begin
  p_cpf_clean := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if length(p_cpf_clean) <> 11 or p_email is null or p_email = '' then
    return jsonb_build_object('found', false);
  end if;
  select nome_completo into r
  from pending_users
  where lower(trim(email)) = lower(trim(p_email))
    and regexp_replace(cpf, '\D', '', 'g') = p_cpf_clean
    and password_created = false
  limit 1;
  if found then
    return jsonb_build_object('found', true, 'nome_completo', r.nome_completo);
  end if;
  return jsonb_build_object('found', false);
end;
$$;

grant execute on function public.check_pending_signup(text, text) to anon;
grant execute on function public.check_pending_signup(text, text) to authenticated;

-- Cria convite pendente (quem está logado convida).
create or replace function public.create_pending_user(p_email text, p_cpf text, p_nome_completo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p_cpf_clean text;
  new_id uuid;
begin
  p_cpf_clean := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if length(p_cpf_clean) <> 11 or p_email is null or trim(p_email) = '' or p_nome_completo is null or trim(p_nome_completo) = '' then
    raise exception 'Dados inválidos';
  end if;
  insert into pending_users (email, cpf, nome_completo, invited_by)
  values (lower(trim(p_email)), p_cpf_clean, trim(p_nome_completo), auth.uid())
  on conflict (email) do update set
    cpf = excluded.cpf,
    nome_completo = excluded.nome_completo,
    invited_by = excluded.invited_by,
    password_created = false
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.create_pending_user(text, text, text) to authenticated;

-- Marca que o usuário atual (recém-logado) completou a senha (convite aceito).
create or replace function public.complete_pending_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u_email text;
begin
  select coalesce(raw_user_meta_data->>'email', email) into u_email
  from auth.users where id = auth.uid() limit 1;
  if u_email is null then
    return;
  end if;
  update pending_users
  set password_created = true
  where lower(trim(email)) = lower(trim(u_email));
end;
$$;

grant execute on function public.complete_pending_signup() to authenticated;
