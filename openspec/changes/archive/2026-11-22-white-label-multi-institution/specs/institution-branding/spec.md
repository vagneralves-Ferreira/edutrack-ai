# Spec Delta

## Purpose

Garantir que o EduTrack AI apresente uma identidade visual neutra (white-label) antes do login/cadastro e exiba dinamicamente a instituição informada pelo usuário após a autenticação.

## ADDED Requirements

### Requirement: Identidade neutra antes da autenticacao
O sistema SHALL apresentar títulos e textos neutros (sem menção fixa a uma instituição específica) no título do documento HTML, no título da janela desktop Electron e nas telas públicas antes da autenticação.

#### Scenario: Titulo da aplicacao antes do login
- **WHEN** o usuário abre o aplicativo web ou desktop antes de realizar login
- **THEN** o título exibido é `"EduTrack AI | Planner Acadêmico Inteligente"`, sem referência fixa a `"Faculdade Impacta"`

#### Scenario: Cabecalho sem usuario autenticado
- **WHEN** o cabeçalho é renderizado sem usuário autenticado ou sem instituição definida
- **THEN** o sistema NÃO exibe `"Faculdade Impacta"` por padrão e utiliza um rótulo neutro (como `"Planner Acadêmico"`)

### Requirement: Exibicao dinamica da instituicao apos autenticacao
O sistema SHALL exibir no cabeçalho e nas telas autenticadas o nome da instituição informada pelo usuário no cadastro ou perfil, aceitando qualquer instituição (ex.: UNICID, Faculdade Impacta, FIAP, USP), com fallback neutro caso o campo não tenha sido preenchido.

#### Scenario: Usuario autenticado com instituicao preenchida
- **WHEN** o usuário realiza cadastro ou login com o campo de instituição preenchido (por exemplo, `"UNICID"`)
- **THEN** o cabeçalho exibe `"UNICID"` junto ao semestre letivo do usuário

#### Scenario: Usuario autenticado sem instituicao preenchida
- **WHEN** o usuário está autenticado mas não possui instituição cadastrada nos metadados do perfil
- **THEN** o sistema exibe o fallback neutro (`"Planner Acadêmico"`), sem inferir `"Faculdade Impacta"` pelo domínio ou texto fixo
