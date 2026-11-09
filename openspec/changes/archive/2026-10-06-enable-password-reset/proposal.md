\# Proposal: Enable Password Reset



\## Why

O EduTrack AI precisa de permitir que os utilizadores recuperem o acesso às suas contas caso se esqueçam da palavra-passe. O botão "Esqueci a senha" já existe no ecrã de login, mas atualmente não tem ação associada.



\## What Changes

\* Ativação da função de recuperação nativa do Supabase (`resetPasswordForEmail`) no ficheiro `LoginView.tsx`.

\* Criação de um novo ecrã `ResetPasswordView.tsx` para o utilizador introduzir e guardar a nova palavra-passe.

\* Registo da nova rota `/reset-password` no sistema de navegação da aplicação.



\## Impact

\* Modifica o componente de login existente.

\* Adiciona uma nova vista (view) ao frontend.

\* Não altera a estrutura da base de dados (o Supabase Auth gere os tokens automaticamente).

