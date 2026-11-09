# subjects-crud-api Specification

## Purpose
Especificar os endpoints e restricoes de seguranca para a tabela subjects.

## ADDED Requirements

### Requirement: Operacoes CRUD Isoladas por Usuario
A API REST SHALL permitir criar, listar, atualizar e remover disciplinas apenas para o user_id correspondente ao JWT ativo.

#### Scenario: Acesso a dados de terceiros
- **WHEN** um utilizador tenta aceder ou alterar disciplinas de outro user_id
- **THEN** a API nega o acesso e retorna status HTTP 403 / lista vazia.
