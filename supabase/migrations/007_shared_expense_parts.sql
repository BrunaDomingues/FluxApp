-- Partes de despesas compartilhadas: quando alguém divide uma despesa com outro usuário vinculado,
-- o outro vê só o valor da parte dele e pode marcar como pago (ou o dono da despesa marca recebimento).
-- Execute após 006.

create table if not exists public.shared_expense_parts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  for_user_id uuid not null references auth.users(id) on delete cascade,
  transacao_id text not null,
  descricao text not null default '',
  valor numeric not null check (valor > 0),
  pago boolean not null default false,
  created_at timestamptz default now(),
  unique(owner_user_id, transacao_id, for_user_id)
);

create index if not exists idx_shared_expense_parts_for_user on public.shared_expense_parts(for_user_id);
create index if not exists idx_shared_expense_parts_owner on public.shared_expense_parts(owner_user_id);
create index if not exists idx_shared_expense_parts_pago on public.shared_expense_parts(pago) where pago = false;

alter table public.shared_expense_parts enable row level security;

create policy "Users can manage own shared parts as owner"
  on public.shared_expense_parts for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "Users can view own shared parts as debtor"
  on public.shared_expense_parts for select
  using (auth.uid() = for_user_id);

-- Registra partes ao criar/editar despesa dividida. p_parts = [{ "for_user_id": "uuid", "valor": 25 }]
create or replace function public.register_shared_expense_parts(
  p_owner_user_id uuid,
  p_transacao_id text,
  p_descricao text,
  p_parts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  part jsonb;
  p_for_user_id uuid;
  p_valor numeric;
begin
  if p_owner_user_id is null or p_transacao_id is null or p_parts is null or jsonb_array_length(p_parts) = 0 then
    return;
  end if;
  delete from shared_expense_parts
  where owner_user_id = p_owner_user_id and transacao_id = p_transacao_id;
  for part in select * from jsonb_array_elements(p_parts)
  loop
    p_for_user_id := (part->>'for_user_id')::uuid;
    p_valor := (part->>'valor')::numeric;
    if p_for_user_id is not null and p_for_user_id <> p_owner_user_id and p_valor > 0 then
      insert into shared_expense_parts (owner_user_id, for_user_id, transacao_id, descricao, valor, pago)
      values (p_owner_user_id, p_for_user_id, p_transacao_id, coalesce(nullif(trim(p_descricao), ''), 'Despesa compartilhada'), p_valor, false);
    end if;
  end loop;
end;
$$;

-- Lista pendentes para o usuário atual (partes que ele deve, ainda não pagas).
create or replace function public.get_my_pending_shared_expenses()
returns table (
  part_id uuid,
  owner_user_id uuid,
  owner_nome text,
  transacao_id text,
  descricao text,
  valor numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as part_id,
    p.owner_user_id,
    prof.nome_completo as owner_nome,
    p.transacao_id,
    p.descricao,
    p.valor,
    p.created_at
  from shared_expense_parts p
  join profiles prof on prof.id = p.owner_user_id
  where p.for_user_id = auth.uid() and p.pago = false
  order by p.created_at asc;
$$;

-- Marca parte como paga e adiciona a despesa na carteira do devedor (user_data).
create or replace function public.mark_shared_expense_part_paid(p_part_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part record;
  v_data jsonb;
  v_contas jsonb;
  v_transacoes jsonb;
  v_conta jsonb;
  v_new_tx jsonb;
  v_now text;
  v_mes int;
  v_ano int;
  i int;
begin
  select id, for_user_id, owner_user_id, descricao, valor into v_part
  from shared_expense_parts where id = p_part_id and for_user_id = auth.uid() and pago = false;
  if v_part.id is null then
    return jsonb_build_object('ok', false, 'error', 'Parte não encontrada ou já paga');
  end if;
  update shared_expense_parts set pago = true where id = p_part_id;
  select data into v_data from user_data where user_id = v_part.for_user_id;
  if v_data is null then
    v_data := '{"contas":[{"id":"carteira","nome":"Carteira","saldo":0}],"transacoes":[]}'::jsonb;
  end if;
  v_now := to_char(now(), 'DD/MM/YYYY');
  v_mes := extract(month from now())::int - 1;
  v_ano := extract(year from now())::int;
  v_new_tx := jsonb_build_object(
    'id', (round(extract(epoch from now()) * 1000))::text,
    'tipo', 'saida',
    'valor', -(v_part.valor)::double precision,
    'descricao', 'Parte: ' || coalesce(v_part.descricao, 'despesa compartilhada'),
    'contaId', 'carteira',
    'data', v_now,
    'mes', v_mes,
    'ano', v_ano,
    'sharedExpensePartId', p_part_id
  );
  v_transacoes := coalesce(v_data->'transacoes', '[]'::jsonb) || v_new_tx;
  v_data := jsonb_set(v_data, '{transacoes}', v_transacoes);
  v_contas := v_data->'contas';
  if jsonb_array_length(coalesce(v_contas, '[]'::jsonb)) > 0 then
    v_contas := (
      select jsonb_agg(
        case when elem->>'id' = 'carteira' then jsonb_set(elem, '{saldo}', to_jsonb((coalesce((elem->>'saldo')::numeric, 0) - v_part.valor)::double precision))
        else elem end
      )
      from jsonb_array_elements(v_contas) elem
    );
    v_data := jsonb_set(v_data, '{contas}', v_contas);
  end if;
  update user_data set data = v_data, updated_at = now() where user_id = v_part.for_user_id;
  if not found then
    insert into user_data (user_id, data, updated_at) values (v_part.for_user_id, v_data, now());
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Quando o dono da despesa registra recebimento do devedor: marca partes como pagas e debita na carteira do devedor.
create or replace function public.on_recebimento_from_user(
  p_owner_user_id uuid,
  p_from_user_id uuid,
  p_valor numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part record;
  v_resto numeric := p_valor;
  v_data jsonb;
  v_contas jsonb;
  v_transacoes jsonb;
  v_new_tx jsonb;
  v_now text;
  v_mes int;
  v_ano int;
  v_total_debitado numeric := 0;
begin
  if p_owner_user_id is null or p_from_user_id is null or p_valor is null or p_valor <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Parâmetros inválidos');
  end if;
  if p_owner_user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Sem permissão');
  end if;
  for v_part in
    select id, valor, descricao from shared_expense_parts
    where owner_user_id = p_owner_user_id and for_user_id = p_from_user_id and pago = false
    order by created_at asc
  loop
    exit when v_resto <= 0;
    if v_part.valor <= v_resto then
      update shared_expense_parts set pago = true where id = v_part.id;
      v_resto := v_resto - v_part.valor;
      v_total_debitado := v_total_debitado + v_part.valor;
      select data into v_data from user_data where user_id = p_from_user_id;
      if v_data is null then
        v_data := '{"contas":[{"id":"carteira","nome":"Carteira","saldo":0}],"transacoes":[]}'::jsonb;
      end if;
      v_now := to_char(now(), 'DD/MM/YYYY');
      v_mes := extract(month from now())::int - 1;
      v_ano := extract(year from now())::int;
      v_new_tx := jsonb_build_object(
        'id', (round(extract(epoch from now()) * 1000) + (v_total_debitado * 1000))::text,
        'tipo', 'saida',
        'valor', -(v_part.valor)::double precision,
        'descricao', 'Parte: ' || coalesce(v_part.descricao, 'despesa compartilhada'),
        'contaId', 'carteira',
        'data', v_now,
        'mes', v_mes,
        'ano', v_ano,
        'sharedExpensePartId', v_part.id
      );
      v_transacoes := coalesce(v_data->'transacoes', '[]'::jsonb) || v_new_tx;
      v_data := jsonb_set(v_data, '{transacoes}', v_transacoes);
      v_contas := v_data->'contas';
      if jsonb_array_length(coalesce(v_contas, '[]'::jsonb)) > 0 then
        v_contas := (
          select jsonb_agg(
            case when elem->>'id' = 'carteira' then jsonb_set(elem, '{saldo}', to_jsonb((coalesce((elem->>'saldo')::numeric, 0) - v_part.valor)::double precision))
            else elem end
          )
          from jsonb_array_elements(v_contas) elem
        );
        v_data := jsonb_set(v_data, '{contas}', v_contas);
      end if;
      update user_data set data = v_data, updated_at = now() where user_id = p_from_user_id;
      if not found then
        insert into user_data (user_id, data, updated_at) values (p_from_user_id, v_data, now());
      end if;
    else
      exit;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'debitado', v_total_debitado);
end;
$$;

grant execute on function public.register_shared_expense_parts(uuid, text, text, jsonb) to authenticated;
grant execute on function public.get_my_pending_shared_expenses() to authenticated;
grant execute on function public.mark_shared_expense_part_paid(uuid) to authenticated;
grant execute on function public.on_recebimento_from_user(uuid, uuid, numeric) to authenticated;
