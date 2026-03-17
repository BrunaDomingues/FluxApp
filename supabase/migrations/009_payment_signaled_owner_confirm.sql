-- Pagamento sinalizado pelo devedor: credor pode ver e confirmar (levar dados para a conta).
-- Execute após 008.

-- Colunas na part para guardar o que o devedor sinalizou e se o dono já confirmou recebimento
alter table public.shared_expense_parts
  add column if not exists data_pagamento_sinalizada text,
  add column if not exists horario_pagamento_sinalizado text,
  add column if not exists comprovante_sinalizado text,
  add column if not exists owner_confirmed_recebimento boolean not null default false;

-- Atualiza mark_shared_expense_part_paid para gravar dados na part (para o credor confirmar depois)
create or replace function public.mark_shared_expense_part_paid(
  p_part_id uuid,
  p_data text default null,
  p_horario text default null,
  p_comprovante text default null
)
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
  v_new_tx jsonb;
  v_now text;
  v_mes int;
  v_ano int;
  v_dia int;
  v_data_str text;
  v_parts text[];
begin
  select id, for_user_id, owner_user_id, descricao, valor into v_part
  from shared_expense_parts where id = p_part_id and for_user_id = auth.uid() and pago = false;
  if v_part.id is null then
    return jsonb_build_object('ok', false, 'error', 'Parte não encontrada ou já paga');
  end if;
  update shared_expense_parts
  set pago = true,
      data_pagamento_sinalizada = case when p_data is not null and trim(p_data) <> '' then trim(p_data) else null end,
      horario_pagamento_sinalizado = case when p_horario is not null and trim(p_horario) <> '' then trim(p_horario) else null end,
      comprovante_sinalizado = case when p_comprovante is not null and trim(p_comprovante) <> '' then p_comprovante else null end,
      owner_confirmed_recebimento = false
  where id = p_part_id;
  select data into v_data from user_data where user_id = v_part.for_user_id;
  if v_data is null then
    v_data := '{"contas":[{"id":"carteira","nome":"Carteira","saldo":0}],"transacoes":[]}'::jsonb;
  end if;

  if p_data is not null and trim(p_data) <> '' and p_data ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
    v_parts := string_to_array(replace(p_data, '/', ' '), ' ');
    if array_length(v_parts, 1) >= 3 then
      v_dia := least(31, greatest(1, (v_parts[1])::int));
      v_mes := least(12, greatest(1, (v_parts[2])::int)) - 1;
      v_ano := (v_parts[3])::int;
      v_data_str := lpad(v_parts[1], 2, '0') || '/' || lpad(v_parts[2], 2, '0') || '/' || v_parts[3];
    else
      v_now := to_char(now(), 'DD/MM/YYYY');
      v_mes := extract(month from now())::int - 1;
      v_ano := extract(year from now())::int;
      v_data_str := v_now;
    end if;
  else
    v_now := to_char(now(), 'DD/MM/YYYY');
    v_mes := extract(month from now())::int - 1;
    v_ano := extract(year from now())::int;
    v_data_str := v_now;
  end if;

  v_new_tx := jsonb_build_object(
    'id', (round(extract(epoch from now()) * 1000))::text,
    'tipo', 'saida',
    'valor', -(v_part.valor)::double precision,
    'descricao', 'Parte: ' || coalesce(v_part.descricao, 'despesa compartilhada'),
    'contaId', 'carteira',
    'data', v_data_str,
    'mes', v_mes,
    'ano', v_ano,
    'sharedExpensePartId', p_part_id
  );
  if p_horario is not null and trim(p_horario) <> '' then
    v_new_tx := v_new_tx || jsonb_build_object('horarioPagamento', trim(p_horario));
  end if;
  if p_comprovante is not null and trim(p_comprovante) <> '' then
    v_new_tx := v_new_tx || jsonb_build_object('comprovante', p_comprovante);
  end if;

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

-- Lista partes que o credor (owner) ainda não confirmou: pagamento sinalizado pelo devedor
create or replace function public.get_payment_signaled_awaiting_confirmation()
returns table (
  part_id uuid,
  for_user_id uuid,
  debtor_nome text,
  descricao text,
  valor numeric,
  data_pagamento_sinalizada text,
  horario_pagamento_sinalizado text,
  has_comprovante boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as part_id,
    p.for_user_id,
    prof.nome_completo as debtor_nome,
    p.descricao,
    p.valor,
    p.data_pagamento_sinalizada,
    p.horario_pagamento_sinalizado,
    (p.comprovante_sinalizado is not null and trim(p.comprovante_sinalizado) <> '') as has_comprovante,
    p.created_at
  from shared_expense_parts p
  join profiles prof on prof.id = p.for_user_id
  where p.owner_user_id = auth.uid()
    and p.pago = true
    and coalesce(p.owner_confirmed_recebimento, false) = false
  order by p.created_at desc;
$$;

-- Credor confirma: leva o valor para sua conta (receita) com data/horário/comprovante sinalizados
create or replace function public.confirm_owner_recebimento_from_part(p_part_id uuid)
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
  v_new_tx jsonb;
  v_recebimentos jsonb;
  v_new_rec jsonb;
  v_data_str text;
  v_mes int;
  v_ano int;
  v_parts text[];
begin
  select id, owner_user_id, for_user_id, descricao, valor,
         data_pagamento_sinalizada, horario_pagamento_sinalizado, comprovante_sinalizado
  into v_part
  from shared_expense_parts
  where id = p_part_id and owner_user_id = auth.uid() and pago = true
    and coalesce(owner_confirmed_recebimento, false) = false;
  if v_part.id is null then
    return jsonb_build_object('ok', false, 'error', 'Parte não encontrada ou já confirmada');
  end if;

  select data into v_data from user_data where user_id = v_part.owner_user_id;
  if v_data is null then
    v_data := '{"contas":[{"id":"carteira","nome":"Carteira","saldo":0}],"transacoes":[]}'::jsonb;
  end if;

  if v_part.data_pagamento_sinalizada is not null and trim(v_part.data_pagamento_sinalizada) <> ''
     and v_part.data_pagamento_sinalizada ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
    v_parts := string_to_array(replace(trim(v_part.data_pagamento_sinalizada), '/', ' '), ' ');
    if array_length(v_parts, 1) >= 3 then
      v_data_str := lpad(v_parts[1], 2, '0') || '/' || lpad(v_parts[2], 2, '0') || '/' || v_parts[3];
      v_mes := least(12, greatest(1, (v_parts[2])::int)) - 1;
      v_ano := (v_parts[3])::int;
    else
      v_data_str := to_char(now(), 'DD/MM/YYYY');
      v_mes := extract(month from now())::int - 1;
      v_ano := extract(year from now())::int;
    end if;
  else
    v_data_str := to_char(now(), 'DD/MM/YYYY');
    v_mes := extract(month from now())::int - 1;
    v_ano := extract(year from now())::int;
  end if;

  v_new_tx := jsonb_build_object(
    'id', (round(extract(epoch from now()) * 1000))::text,
    'tipo', 'entrada',
    'valor', (v_part.valor)::double precision,
    'descricao', 'Recebimento (parte sinalizada)',
    'contaId', 'carteira',
    'data', v_data_str,
    'mes', v_mes,
    'ano', v_ano,
    'sharedExpensePartId', p_part_id,
    'recebimentoDeParteSinalizada', true
  );
  if v_part.horario_pagamento_sinalizado is not null and trim(v_part.horario_pagamento_sinalizado) <> '' then
    v_new_tx := v_new_tx || jsonb_build_object('horarioPagamento', trim(v_part.horario_pagamento_sinalizado));
  end if;
  if v_part.comprovante_sinalizado is not null and trim(v_part.comprovante_sinalizado) <> '' then
    v_new_tx := v_new_tx || jsonb_build_object('comprovante', v_part.comprovante_sinalizado);
  end if;

  v_transacoes := coalesce(v_data->'transacoes', '[]'::jsonb) || v_new_tx;
  v_data := jsonb_set(v_data, '{transacoes}', v_transacoes);
  v_contas := v_data->'contas';
  if jsonb_array_length(coalesce(v_contas, '[]'::jsonb)) > 0 then
    v_contas := (
      select jsonb_agg(
        case when elem->>'id' = 'carteira' then jsonb_set(elem, '{saldo}', to_jsonb((coalesce((elem->>'saldo')::numeric, 0) + v_part.valor)::double precision))
        else elem end
      )
      from jsonb_array_elements(v_contas) elem
    );
    v_data := jsonb_set(v_data, '{contas}', v_contas);
  end if;
  v_new_rec := jsonb_build_object(
    'id', (round(extract(epoch from now()) * 1000) + 1)::text,
    'userId', v_part.for_user_id::text,
    'valor', v_part.valor::double precision,
    'data', v_data_str,
    'mes', v_mes,
    'ano', v_ano
  );
  if v_part.horario_pagamento_sinalizado is not null and trim(v_part.horario_pagamento_sinalizado) <> '' then
    v_new_rec := v_new_rec || jsonb_build_object('horario', trim(v_part.horario_pagamento_sinalizado));
  end if;
  if v_part.comprovante_sinalizado is not null and trim(v_part.comprovante_sinalizado) <> '' then
    v_new_rec := v_new_rec || jsonb_build_object('comprovante', v_part.comprovante_sinalizado);
  end if;
  v_recebimentos := coalesce(v_data->'recebimentosUsuarios', '[]'::jsonb) || v_new_rec;
  v_data := jsonb_set(v_data, '{recebimentosUsuarios}', v_recebimentos);
  update user_data set data = v_data, updated_at = now() where user_id = v_part.owner_user_id;
  if not found then
    insert into user_data (user_id, data, updated_at) values (v_part.owner_user_id, v_data, now());
  end if;

  update shared_expense_parts set owner_confirmed_recebimento = true where id = p_part_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_payment_signaled_awaiting_confirmation() to authenticated;
grant execute on function public.confirm_owner_recebimento_from_part(uuid) to authenticated;
