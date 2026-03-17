-- Vínculo entre contas: quem convidou e quem aceitou o convite aparecem um no app do outro.
-- Desvincular remove só o vínculo; despesas e nomes das pessoas continuam no histórico.
-- Execute após 003 e 004.

create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, linked_user_id),
  check (user_id <> linked_user_id)
);

create index if not exists idx_user_connections_user_id on public.user_connections(user_id);
create index if not exists idx_user_connections_linked_user_id on public.user_connections(linked_user_id);

alter table public.user_connections enable row level security;

create policy "Users can view own connections"
  on public.user_connections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own connections"
  on public.user_connections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own connections"
  on public.user_connections for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ao completar o cadastro (convite aceito), cria o vínculo nos dois sentidos
create or replace function public.complete_pending_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u_email text;
  inviter_id uuid;
  new_user_id uuid;
begin
  new_user_id := auth.uid();
  select coalesce(raw_user_meta_data->>'email', email) into u_email
  from auth.users where id = new_user_id limit 1;
  if u_email is null then
    return;
  end if;
  update pending_users
  set password_created = true
  where lower(trim(email)) = lower(trim(u_email));

  select invited_by into inviter_id
  from pending_users
  where lower(trim(email)) = lower(trim(u_email))
  limit 1;
  if inviter_id is not null and inviter_id <> new_user_id then
    insert into user_connections (user_id, linked_user_id)
    values (inviter_id, new_user_id), (new_user_id, inviter_id)
    on conflict (user_id, linked_user_id) do nothing;
  end if;
end;
$$;

-- Lista usuários vinculados à conta atual (id, nome, email do profiles)
create or replace function public.get_linked_users()
returns table (linked_user_id uuid, nome text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select uc.linked_user_id, p.nome_completo, p.email
  from user_connections uc
  join profiles p on p.id = uc.linked_user_id
  where uc.user_id = auth.uid();
$$;

grant execute on function public.get_linked_users() to authenticated;

-- Remove o vínculo entre a conta atual e o outro usuário (nos dois lados)
create or replace function public.unlink_user(p_linked_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from user_connections
  where (user_id = auth.uid() and linked_user_id = p_linked_user_id)
     or (user_id = p_linked_user_id and linked_user_id = auth.uid());
end;
$$;

grant execute on function public.unlink_user(uuid) to authenticated;
