-- Marca parte como paga com opção de data, horário e comprovante.
-- Execute após 007.

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
  update shared_expense_parts set pago = true where id = p_part_id;
  select data into v_data from user_data where user_id = v_part.for_user_id;
  if v_data is null then
    v_data := '{"contas":[{"id":"carteira","nome":"Carteira","saldo":0}],"transacoes":[]}'::jsonb;
  end if;

  if p_data is not null and trim(p_data) <> '' and p_data ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
    v_parts := string_to_array(replace(p_data, '/', ' '), ' ');
    if array_length(v_parts, 1) >= 3 then
      v_dia := least(31, greatest(1, (v_parts[1])::int));
      v_mes := least(11, greatest(0, (v_parts[2])::int - 1));
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
