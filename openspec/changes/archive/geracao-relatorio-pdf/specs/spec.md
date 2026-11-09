# pdf-report Specification

## Purpose
Especificar a geracao de relatorios academicos em formato PDF/estruturado.

## ADDED Requirements

### Requirement: Exportacao de Relatorio de Desempenho
O script SHALL compilar disciplinas, tarefas concluidas e percentuais em um documento consolidado.

#### Scenario: Solicitacao de relatorio
- **WHEN** a geracao do relatorio e acionada
- **THEN** o sistema gera o resumo das metricas globais e os detalhes por disciplina.
