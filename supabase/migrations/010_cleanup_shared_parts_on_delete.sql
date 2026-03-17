-- Limpeza de despesas compartilhadas quando o criador apaga/zera dados.
-- Regra: se ainda NÃO foi paga, some da conta do outro usuário; se já foi paga, mantém.
-- Execute após 009.

create or replace function public.delete_unpaid_shared_expense_parts(p_transacao_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if p_transacao_id is null or trim(p_transacao_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'transacao_id inválido');
  end if;

  delete from shared_expense_parts
  where owner_user_id = auth.uid()
    and transacao_id = trim(p_transacao_id)
    and pago = false;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_count);
end;
$$;

create or replace function public.delete_all_unpaid_shared_expense_parts_as_owner()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  delete from shared_expense_parts
  where owner_user_id = auth.uid()
    and pago = false;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_count);
end;
$$;

grant execute on function public.delete_unpaid_shared_expense_parts(text) to authenticated;
grant execute on function public.delete_all_unpaid_shared_expense_parts_as_owner() to authenticated;

