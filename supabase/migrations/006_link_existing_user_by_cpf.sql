-- Vincular à conta existente pelo CPF (quem já tem conta no app).
-- Execute após 005_user_connections.sql.

create or replace function public.link_existing_user_by_cpf(p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p_cpf_clean text;
  other_id uuid;
  other_nome text;
  other_email text;
begin
  p_cpf_clean := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if length(p_cpf_clean) <> 11 then
    return jsonb_build_object('ok', false, 'error', 'CPF inválido');
  end if;
  select p.id, p.nome_completo, p.email into other_id, other_nome, other_email
  from profiles p
  where regexp_replace(p.cpf, '\D', '', 'g') = p_cpf_clean
  limit 1;
  if other_id is null then
    return jsonb_build_object('ok', false, 'error', 'Nenhuma conta encontrada com este CPF');
  end if;
  if other_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Não é possível vincular sua própria conta');
  end if;
  insert into user_connections (user_id, linked_user_id)
  values (auth.uid(), other_id), (other_id, auth.uid())
  on conflict (user_id, linked_user_id) do nothing;
  return jsonb_build_object('ok', true, 'id', other_id, 'nome', coalesce(other_nome, ''), 'email', coalesce(other_email, ''));
end;
$$;

grant execute on function public.link_existing_user_by_cpf(text) to authenticated;
