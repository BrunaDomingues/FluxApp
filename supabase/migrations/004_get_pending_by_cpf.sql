-- Retorna e-mail e nome de convite pendente apenas pelo CPF (para preencher o formulário de criar conta).
-- Execute após 003_pending_users.sql.

create or replace function public.get_pending_by_cpf(p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p_cpf_clean text;
  r record;
begin
  p_cpf_clean := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if length(p_cpf_clean) <> 11 then
    return jsonb_build_object('found', false);
  end if;
  select email, nome_completo into r
  from pending_users
  where regexp_replace(cpf, '\D', '', 'g') = p_cpf_clean
    and password_created = false
  limit 1;
  if found then
    return jsonb_build_object('found', true, 'email', r.email, 'nome_completo', r.nome_completo);
  end if;
  return jsonb_build_object('found', false);
end;
$$;

grant execute on function public.get_pending_by_cpf(text) to anon;
grant execute on function public.get_pending_by_cpf(text) to authenticated;
