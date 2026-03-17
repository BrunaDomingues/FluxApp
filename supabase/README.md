# Supabase – FluxApp

Para o cadastro com **nome completo** e **CPF**, validando se **e-mail e CPF já não existem** no banco:

1. No [Dashboard do Supabase](https://supabase.com/dashboard), abra seu projeto.
2. **Authentication → Providers → Email:** desative **"Confirm email"** se quiser que o usuário entre logo após criar a conta (a confirmação de e-mail pode ser feita depois).
3. No **SQL Editor**, execute na ordem: `001_profiles_and_check_cpf.sql`, `002_user_data.sql`, `003_pending_users.sql`, `004_get_pending_by_cpf.sql`, `005_user_connections.sql` e `006_link_existing_user_by_cpf.sql`.

Isso cria:

- A tabela **profiles** (id, email, nome_completo, cpf) vinculada ao usuário de autenticação.
- A função **check_cpf_exists(cpf)** para evitar CPF duplicado no cadastro.
- Políticas RLS para cada usuário ver/atualizar apenas o próprio perfil.

O app só valida se o **e-mail** e o **CPF** já existem (e-mail via Supabase Auth; CPF via `check_cpf_exists`). Não exige confirmação de e-mail para entrar.

**Sincronização dos dados do app:** A migração `002_user_data.sql` cria a tabela `user_data`, onde ficam contas, cartões, transações, objetivos, financiamentos, orçamento, usuários (dividir despesas), recebimentos, cobranças recebidas, categorias e cards da tela inicial. Quando o usuário está logado, o app carrega esses dados do Supabase ao abrir e salva automaticamente (com debounce) ao alterar qualquer coisa. Assim os dados ficam na nuvem e podem ser acessados de outro aparelho com a mesma conta.

**Convite e vínculo entre contas:** A migração `003_pending_users.sql` cria a tabela `pending_users` e as funções para convidar alguém (e-mail + CPF + nome). Em Usuários, ao adicionar uma pessoa com **CPF que já tem conta no app**, o app **apenas vincula** as duas contas (sem criar convite). Se o CPF ainda não tem conta, você pode informar o e-mail e tocar em **Enviar convite**; a pessoa cria a conta com o mesmo e-mail e CPF e o vínculo é criado automaticamente. As migrações `005_user_connections.sql` e `006_link_existing_user_by_cpf.sql` criam a tabela de vínculos e a função para vincular por CPF.

**Redefinição de senha (código por e-mail):** O app envia um **código de 8 dígitos** para o e-mail da conta. A pessoa digita o código na tela **Código de verificação** e em seguida define a nova senha no app.

- No Supabase: **Authentication → Email Templates → Magic Link**. Para enviar o código em vez do link, altere o corpo do e-mail para exibir apenas o código, por exemplo: `Seu código de verificação: {{ .Token }}`. A variável `{{ .Token }}` contém o código (8 dígitos no Supabase) quando se usa `signInWithOtp`. (Se o template já enviar um link, o usuário pode usar o token que aparece na URL ou você pode criar um template customizado só com o código.)

Se não rodar as migrações, o app ainda funciona em modo local (AsyncStorage), mas sem verificação de CPF no cadastro, sem sincronização na nuvem e sem convite pendente.
