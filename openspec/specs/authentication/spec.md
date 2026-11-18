# authentication Specification

## Purpose
Garantir que cada aluno acesse o EduTrack AI com a própria conta (Supabase Auth) e consiga recuperar o acesso com segurança quando esquecer a senha.

## Requirements

### Requirement: Recuperacao de Senha
O sistema SHALL permitir a recuperação de senha por e-mail: a tela de login SHALL enviar o link de redefinição pelo Supabase Auth para o e-mail informado, e a tela "Alterar Minha Senha" SHALL aceitar a nova senha somente com uma sessão de recuperação válida.

#### Scenario: Solicitar recuperacao
- **WHEN** o usuário informa um e-mail válido e clica em "Esqueci a senha"
- **THEN** o sistema envia o e-mail de recuperação e mostra a mensagem de link enviado

#### Scenario: Definir nova senha
- **WHEN** o usuário abre o link recebido e informa a nova senha e a confirmação iguais, com pelo menos 6 caracteres
- **THEN** a senha é atualizada e o usuário volta para a tela de login

#### Scenario: Link expirado
- **WHEN** o usuário tenta alterar a senha sem uma sessão de recuperação válida
- **THEN** o sistema informa que o link expirou ou é inválido e não altera a senha
