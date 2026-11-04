# search-subjects Specification

## Purpose
Especificar o contrato do algoritmo de busca hibrida de disciplinas em Python.

## ADDED Requirements

### Requirement: Filtragem Inteligente por Termo e Status
O script SHALL filtrar disciplinas combinando nome, codigo e flag de tarefas atrasadas.

#### Scenario: Consulta por palavra-chave ou status
- **WHEN** uma consulta de busca e enviada ao script
- **THEN** o sistema retorna as disciplinas correspondentes com o score de relevancia formatado em JSON.
