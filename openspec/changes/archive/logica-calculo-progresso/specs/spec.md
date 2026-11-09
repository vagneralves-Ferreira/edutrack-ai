# calculate-progress Specification

## Purpose
Define o contrato do calculo de progresso de tarefas em Python.

## ADDED Requirements

### Requirement: Calculo de Percentual com Tratamento de Zero
O script SHALL calcular (completed / total) * 100 e retornar 0.0 quando total e igual a 0.

#### Scenario: Total de tarefas e zero
- **WHEN** total_tasks e 0
- **THEN** o sistema retorna percentage igual a 0.0 sem lancar excecao.
