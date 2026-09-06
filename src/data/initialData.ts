import type { Subject, Task } from '../types';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sql-fundamentals',
    code: 'IMP-SQL101',
    name: 'SQL Fundamentals',
    professors: ['Prof. Evandro'],
    progress: 78,
    totalHours: 80,
    completedHours: 62.4,
    studyTimeHours: 28,
    color: '#0ea5e9',
    accentColor: 'from-sky-500 to-blue-600',
    nextClass: 'Terça-feira, 19:15',
    schedule: 'Terças e Quintas • 19:15 - 21:00',
    room: 'Lab 402 - Campus Paulista / Online',
    description: 'Comandos DDL, DML, DQL avançados, junções complexas (JOINs), agregações, subqueries e manipulação de conjuntos relacionais com SGBDs modernos.',
    topics: [
      'DDL e Tipos de Dados Relacionais',
      'SELECT, WHERE, ORDER BY e Filtros',
      'INNER, LEFT, RIGHT e FULL OUTER JOIN',
      'Funções de Agregação e GROUP BY / HAVING',
      'Subqueries correlacionadas e CTEs (WITH)'
    ],
    modules: [
      {
        id: 'mod-sql-1',
        number: 1,
        title: 'Arquitetura Relacional & Comandos DDL',
        hours: 18,
        description: 'Criação de esquemas, restrições de integridade (PK, FK, CHECK, UNIQUE) e tipos de dados em SGBDs relacionais.',
        topics: ['Tipos primitivos e precisão numérica', 'Constraints e integridade referencial', 'Alter Table e migrações']
      },
      {
        id: 'mod-sql-2',
        number: 2,
        title: 'Manipulação de Dados (DML) & Junções Complexas',
        hours: 26,
        description: 'Recuperação avançada de dados através de JOINs múltiplos, aliases, tratamento de valores nulos e predicados.',
        topics: ['INNER, LEFT, RIGHT e FULL OUTER JOIN', 'Cross Joins e Self Joins', 'Filtros com LIKE, IN, BETWEEN e IS NULL']
      },
      {
        id: 'mod-sql-3',
        number: 3,
        title: 'Agrupamentos, Funções de Agregação & Subqueries',
        hours: 20,
        description: 'Cálculo de métricas analíticas em grupos, distinção entre WHERE e HAVING e subqueries correlacionadas.',
        topics: ['SUM, AVG, COUNT, MIN, MAX', 'Agrupamentos compostos com GROUP BY', 'Subqueries escalares e no FROM']
      },
      {
        id: 'mod-sql-4',
        number: 4,
        title: 'CTEs, Funções de Janela & Performance',
        hours: 16,
        description: 'Common Table Expressions (WITH), paginação eficiente, ROW_NUMBER(), RANK() e introdução a planos de execução.',
        topics: ['CTEs recursivas e legibilidade', 'Window Functions para relatórios analíticos', 'Índices e Explain Plan']
      }
    ],
    materials: [
      {
        id: 'mat-sql-1',
        title: 'Apostila Oficial: Guia Prático de Consultas SQL e JOINs',
        category: 'apostila',
        format: 'PDF Impacta',
        description: 'Material didático completo elaborado pelo corpo docente com mais de 80 exemplos comentados e exercícios resolvidos.',
        badge: 'Oficial Impacta'
      },
      {
        id: 'mat-sql-2',
        title: 'Sistemas de Banco de Dados (Silberschatz, Korth e Sudarshan)',
        category: 'livro',
        format: 'Livro / Referência',
        description: 'Capítulos 3 e 4: Álgebra relacional, sintaxe padrão SQL-99/SQL:2016 e integridade referencial.',
        badge: 'Bibliografia Básica'
      },
      {
        id: 'mat-sql-3',
        title: 'Script de Carga & Laboratório Prático de Consultas DML',
        category: 'laboratorio',
        format: 'Repositório GitHub',
        description: 'Scripts SQL prontos para execução em PostgreSQL e MySQL com base de dados de e-commerce para treino.',
        badge: 'Hands-on Lab'
      },
      {
        id: 'mat-sql-4',
        title: 'Cheat Sheet Visual: Diagrama de Venn e Sintaxe de JOINs',
        category: 'cheatsheet',
        format: 'Guia Rápido',
        description: 'Guia de consulta rápida contendo sintaxe comparada de junções, ordem de execução de cláusulas e funções úteis.',
        badge: 'Cheat Sheet'
      }
    ],
    evaluations: [
      { id: 'ev-1', name: 'Quiz Prático DML', date: '25/08', weight: 15, status: 'completed', grade: 9.5 },
      { id: 'ev-2', name: 'Avaliação Parcial (Consultas & Relatórios)', date: '10/09', weight: 35, status: 'pending' },
      { id: 'ev-3', name: 'Projeto Final de Modelagem & Consultas', date: '24/11', weight: 50, status: 'pending' }
    ]
  },
  {
    id: 'software-engineering',
    code: 'IMP-ENG201',
    name: 'Software Engineering',
    professors: ['Prof. Fábio Nogueira'],
    progress: 65,
    totalHours: 80,
    completedHours: 52,
    studyTimeHours: 24,
    color: '#f59e0b',
    accentColor: 'from-amber-500 to-orange-600',
    nextClass: 'Segunda-feira, 19:15',
    schedule: 'Segundas • 19:15 - 22:45',
    room: 'Sala 305 / Teams Impacta',
    description: 'Ciclos de vida de software, metodologias ágeis (Scrum/Kanban), especificação de requisitos funcionais e não funcionais, arquitetura de software e entrega contínua.',
    topics: [
      'Engenharia de Requisitos & User Stories',
      'Modelagem UML & Diagramas de Sequência',
      'Arquitetura Limpa e Padrões de Projeto (GoF)',
      'Construção de Protótipos e Métricas Ágeis',
      'Testes Automatizados e CI/CD'
    ],
    modules: [
      {
        id: 'mod-eng-1',
        number: 1,
        title: 'Engenharia de Requisitos & Metodologias Ágeis',
        hours: 22,
        description: 'Levantamento de requisitos, critérios de aceite em User Stories, Scrum framework e gestão visual com Kanban.',
        topics: ['Requisitos Funcionais e Não-Funcionais', 'Épicos, Features e User Stories', 'Cerimônias Scrum e estimativas']
      },
      {
        id: 'mod-eng-2',
        number: 2,
        title: 'Arquitetura de Software & Modelagem C4',
        hours: 24,
        description: 'Padrões arquiteturais contemporâneos (Clean Architecture, Ports & Adapters) e documentação visual com o modelo C4.',
        topics: ['Arquitetura Limpa e SOLID', 'Modelo C4 (Context, Container, Component, Code)', 'Diagramas de Sequência UML']
      },
      {
        id: 'mod-eng-3',
        number: 3,
        title: 'Estratégia de Protótipos & Gestão de Produto',
        hours: 18,
        description: 'Definição de escopo funcional, priorização com MoSCoW, métricas de adoção e feedback loop.',
        topics: ['Conceito de Protótipo e hipóteses', 'Matriz de Esforço x Impacto', 'Product Backlog Refinement']
      },
      {
        id: 'mod-eng-4',
        number: 4,
        title: 'Qualidade de Software & Integração Contínua',
        hours: 16,
        description: 'Pirâmide de testes (Unitários, Integração, E2E), automação de pipelines com GitHub Actions e entrega contínua.',
        topics: ['Pirâmide de testes de software', 'Pipelines de CI/CD', 'Code Review e boas práticas de Git']
      }
    ],
    materials: [
      {
        id: 'mat-eng-1',
        title: 'Apostila Oficial: Metodologias Ágeis e Engenharia de Requisitos',
        category: 'apostila',
        format: 'PDF Impacta',
        description: 'Guia metodológico do Prof. Fábio Nogueira com templates de User Stories, critérios de aceite e governança.',
        badge: 'Oficial Impacta'
      },
      {
        id: 'mat-eng-2',
        title: 'Engenharia de Software: Uma Abordagem Profissional (Pressman & Maxim)',
        category: 'livro',
        format: 'Livro / Referência',
        description: 'Referência clássica para conceitos de ciclo de vida de produto, modelagem orientada a objetos e estimativas.',
        badge: 'Bibliografia Básica'
      },
      {
        id: 'mat-eng-3',
        title: 'Template de Arquitetura C4 e Especificação SRS',
        category: 'laboratorio',
        format: 'Repositório GitHub',
        description: 'Estrutura padrão de repositório com diagramas Structurizr/Mermaid e template Markdown para entregas de projetos.',
        badge: 'Template Prático'
      },
      {
        id: 'mat-eng-4',
        title: 'Guia Rápido: Princípios SOLID e Padrões GoF',
        category: 'cheatsheet',
        format: 'Guia Rápido',
        description: 'Resumo com exemplos de código dos 5 princípios SOLID e dos principais padrões criacionais e estruturais.',
        badge: 'Cheat Sheet'
      }
    ],
    evaluations: [
      { id: 'ev-4', name: 'Documentação de Requisitos SRS', date: '28/08', weight: 20, status: 'completed', grade: 8.8 },
      { id: 'ev-5', name: 'Avaliação Parcial (Arquitetura & Pitch Técnico)', date: '08/09', weight: 40, status: 'pending' },
      { id: 'ev-6', name: 'Release Final do Produto & Deploy', date: '29/11', weight: 40, status: 'pending' }
    ]
  },
  {
    id: 'programming-algorithms',
    code: 'IMP-ALG102',
    name: 'Programming & Algorithms',
    professors: ['Prof. Odair', 'Prof. João Roberto'],
    progress: 84,
    totalHours: 100,
    completedHours: 84,
    studyTimeHours: 36,
    color: '#10b981',
    accentColor: 'from-emerald-500 to-teal-600',
    nextClass: 'Quarta-feira, 19:15',
    schedule: 'Quartas e Sextas • 19:15 - 21:00',
    room: 'Lab 201 - Prédio Central',
    description: 'Estruturas de dados fundamentais (vetores, matrizes, pilhas, filas, árvores), análise de complexidade assintótica (Big-O), algoritmos de busca e ordenação e recursão.',
    topics: [
      'Lógica Estruturada & Recursividade',
      'Análise de Complexidade de Tempo e Espaço (Big-O)',
      'Algoritmos de Ordenação (QuickSort, MergeSort)',
      'Estruturas Lineares: Pilhas, Filas e Listas Ligadas',
      'Tabelas Hash e Introdução a Árvores Binárias'
    ],
    modules: [
      {
        id: 'mod-alg-1',
        number: 1,
        title: 'Lógica Avançada & Recursividade',
        hours: 24,
        description: 'Mapeamento de pilha de chamadas (call stack), condição de parada e formulação de funções recursivas eficientes.',
        topics: ['Recursão direta e indireta', 'Árvore de recursão e pilha de execução', 'Backtracking introdutório']
      },
      {
        id: 'mod-alg-2',
        number: 2,
        title: 'Análise Assintótica & Notação Big-O',
        hours: 20,
        description: 'Comportamento de algoritmos com crescimento de entrada: O(1), O(log n), O(n), O(n log n) e O(n²).',
        topics: ['Definição formal de limite superior (Big-O)', 'Melhor, pior e caso médio', 'Otimização de laços aninhados']
      },
      {
        id: 'mod-alg-3',
        number: 3,
        title: 'Algoritmos de Busca & Ordenação',
        hours: 30,
        description: 'Implementação detalhada de busca binária e algoritmos de ordenação por comparação e divisão-e-conquista.',
        topics: ['Busca linear vs Busca binária', 'BubbleSort, InsertionSort e SelectionSort', 'QuickSort (pivô) e MergeSort (intercalação)']
      },
      {
        id: 'mod-alg-4',
        number: 4,
        title: 'Estruturas de Dados Lineares & Hash',
        hours: 26,
        description: 'Alocação de nós em memória, manipulação de ponteiros/referências em Pilhas, Filas, Listas Ligadas e Tabelas Hash.',
        topics: ['Pilhas (LIFO) e Filas (FIFO)', 'Listas simplesmente e duplamente encadeadas', 'Funções hash e tratamento de colisões']
      }
    ],
    materials: [
      {
        id: 'mat-alg-1',
        title: 'Apostila: Algoritmos e Estruturas de Dados em C / TypeScript',
        category: 'apostila',
        format: 'PDF Impacta',
        description: 'Material das turmas dos professores Odair e João Roberto com implementação passo a passo e testes comentados.',
        badge: 'Oficial Impacta'
      },
      {
        id: 'mat-alg-2',
        title: 'Algoritmos: Teoria e Prática (Cormen, Leiserson, Rivest e Stein)',
        category: 'livro',
        format: 'Livro / Referência',
        description: 'Capítulos 2, 7 e 10: Análise de algoritmos, ordenação QuickSort e estruturas elementares.',
        badge: 'Bibliografia Básica'
      },
      {
        id: 'mat-alg-3',
        title: 'Laboratório de Benchmarking de Ordenação (QuickSort x MergeSort)',
        category: 'laboratorio',
        format: 'Repositório GitHub',
        description: 'Código fonte com gerador de vetores randômicos e medidor de tempo de execução e comparações.',
        badge: 'Hands-on Lab'
      },
      {
        id: 'mat-alg-4',
        title: 'Guia de Complexidade Big-O e Curvas de Desempenho',
        category: 'cheatsheet',
        format: 'Guia Rápido',
        description: 'Infográfico comparando as ordens de complexidade temporal e espacial das principais estruturas e algoritmos.',
        badge: 'Cheat Sheet'
      }
    ],
    evaluations: [
      { id: 'ev-7', name: 'Laboratório Prático de Algoritmos I', date: '21/08', weight: 20, status: 'completed', grade: 9.8 },
      { id: 'ev-8', name: 'Avaliação Teórico-Prática de Ordenação', date: '15/09', weight: 40, status: 'pending' },
      { id: 'ev-9', name: 'Projeto Integrador de Estruturas de Dados', date: '05/12', weight: 40, status: 'pending' }
    ]
  },
  {
    id: 'database-design',
    code: 'IMP-DBD202',
    name: 'Database Design',
    professors: ['Prof. Evandro / Colegiado de Dados'],
    progress: 52,
    totalHours: 80,
    completedHours: 41.6,
    studyTimeHours: 18,
    color: '#8b5cf6',
    accentColor: 'from-purple-500 to-indigo-600',
    nextClass: 'Quinta-feira, 21:15',
    schedule: 'Quintas • 21:15 - 22:45',
    room: 'Lab 405 - Prédio Central',
    description: 'Modelagem conceitual (DER), lógica e física de bancos de dados relacionais. Regras de normalização (1FN até BCNF), integridade referencial e índices de alta performance.',
    topics: [
      'Modelo Entidade-Relacionamento Conceitual',
      'Transformação Conceitual para Esquema Relacional Lógico',
      'Normalização de Dados (1FN, 2FN, 3FN)',
      'Índices B-Tree, particionamento e performance',
      'Modelagem NoSQL x Relacional híbrida'
    ],
    modules: [
      {
        id: 'mod-dbd-1',
        number: 1,
        title: 'Modelagem Conceitual & Diagrama Entidade-Relacionamento',
        hours: 22,
        description: 'Identificação de entidades fortes, fracas, atributos (simples, compostos, multivalorados) e cardinalidades.',
        topics: ['Entidades e Atributos', 'Relacionamentos 1:1, 1:N e N:M', 'Especialização e generalização no DER']
      },
      {
        id: 'mod-dbd-2',
        number: 2,
        title: 'Mapeamento Conceitual para Esquema Lógico',
        hours: 18,
        description: 'Regras formais de conversão do DER para tabelas relacionais, propagação de chaves estrangeiras e tabelas associativas.',
        topics: ['Mapeamento de 1:N e N:M', 'Tabelas associativas com atributos próprios', 'Tratamento de integridade e constraints']
      },
      {
        id: 'mod-dbd-3',
        number: 3,
        title: 'Teoria da Normalização de Dados (1FN, 2FN, 3FN e BCNF)',
        hours: 24,
        description: 'Identificação de anomalias de redundância e eliminação sistemática de dependências parciais e transitivas.',
        topics: ['Dependência Funcional Completa', 'Primeira Forma Normal (atomicidade)', 'Segunda e Terceira Formas Normais']
      },
      {
        id: 'mod-dbd-4',
        number: 4,
        title: 'Projeto Físico, Indexação & Estratégias Híbridas',
        hours: 16,
        description: 'Tipos de índices em banco de dados, impacto na escrita vs leitura, desnormalização controlada e NoSQL.',
        topics: ['Índices B-Tree e Hash', 'Clustered vs Non-Clustered Indexes', 'Quando desnormalizar com segurança']
      }
    ],
    materials: [
      {
        id: 'mat-dbd-1',
        title: 'Apostila Oficial: Modelagem Conceitual e Normalização 3FN',
        category: 'apostila',
        format: 'PDF Impacta',
        description: 'Apostila detalhada com o método de conversão de DER para relacional e exemplos práticos de desagregação de tabelas.',
        badge: 'Oficial Impacta'
      },
      {
        id: 'mat-dbd-2',
        title: 'Projeto de Banco de Dados (Carlos Alberto Heuser)',
        category: 'livro',
        format: 'Livro / Referência',
        description: 'Livro texto fundamental adotado pela Impacta para ensino da metodologia de projeto conceitual e lógico.',
        badge: 'Bibliografia Básica'
      },
      {
        id: 'mat-dbd-3',
        title: 'Modelos de Diagrama Relacional (brModelo e dbdiagram.io)',
        category: 'laboratorio',
        format: 'Arquivos & Links',
        description: 'Modelos prontos de esquemas normalizados e exercícios práticos de identificação de dependências funcionais.',
        badge: 'Laboratório'
      },
      {
        id: 'mat-dbd-4',
        title: 'Checklist de Verificação de Formas Normais (1FN a BCNF)',
        category: 'cheatsheet',
        format: 'Guia Rápido',
        description: 'Fluxograma de decisão em 4 passos para testar se uma tabela relacional cumpre todos os critérios da 3FN.',
        badge: 'Cheat Sheet'
      }
    ],
    evaluations: [
      { id: 'ev-10', name: 'Entrega do Modelo DER Conceitual', date: '29/08', weight: 20, status: 'completed', grade: 9.0 },
      { id: 'ev-11', name: 'Avaliação Parcial (Esquema Lógico Normalizado)', date: '10/09', weight: 40, status: 'pending' },
      { id: 'ev-12', name: 'Implementação Física & Benchmark', date: '18/11', weight: 40, status: 'pending' }
    ]
  },
  {
    id: 'innovation-lab',
    code: 'IMP-INN303',
    name: 'Innovation Lab: Advanced No/Low Code',
    professors: ['Prof. Fábio e Mentores de Inovação'],
    progress: 90,
    totalHours: 60,
    completedHours: 54,
    studyTimeHours: 14,
    color: '#f97316',
    accentColor: 'from-orange-500 to-rose-600',
    nextClass: 'Sábado, 09:00',
    schedule: 'Sábados quinzenais • 09:00 - 13:00',
    room: 'Espaço Inovação & Coworking Impacta',
    description: 'Prototipação ágil, arquiteturas No-Code / Low-Code corporativas, automação de processos de negócio com APIs e webhooks, e validação rápida de MVPs para o mercado.',
    topics: [
      'Ecossistema Moderno Low-Code / No-Code',
      'Integração de APIs REST via Webhooks',
      'Desenvolvimento de Aplicações Internas Rápidas',
      'Validação de Hipóteses de Negócio & MVP',
      'Governança e Escalabilidade em Low-Code'
    ],
    modules: [
      {
        id: 'mod-inn-1',
        number: 1,
        title: 'Panorama Low-Code / No-Code & Arquitetura Ágil',
        hours: 14,
        description: 'Plataformas corporativas, modelos de componentes, vantagens de time-to-market e análise de viabilidade.',
        topics: ['Evolução do desenvolvimento declarativo', 'Cases de mercado e economia de esforço', 'Limitações e boas práticas']
      },
      {
        id: 'mod-inn-2',
        number: 2,
        title: 'Integrações de Sistemas via Webhooks & REST APIs',
        hours: 18,
        description: 'Comunicação entre serviços heterogêneos, autenticação OAuth2 / API Keys, tratamento de payloads JSON e retry logic.',
        topics: ['Consumo de endpoints REST', 'Webhooks e arquitetura orientada a eventos', 'Tratamento de erros e logs de execução']
      },
      {
        id: 'mod-inn-3',
        number: 3,
        title: 'Validação Rápida de MVPs & Testes de Usuário',
        hours: 16,
        description: 'Construção acelerada de fluxos ponta a ponta, testes com usuários reais e coleta de métricas de engajamento.',
        topics: ['Desenho do fluxo de valor do usuário', 'Métricas de usabilidade e conversão', 'Iteração baseada em feedback']
      },
      {
        id: 'mod-inn-4',
        number: 4,
        title: 'Governança, Segurança & Escalabilidade',
        hours: 12,
        description: 'Gestão de acessos, proteção de dados sensíveis (LGPD), ambientes de Dev/Staging/Prod e migração gradual para código.',
        topics: ['Políticas de segurança em plataformas gerenciadas', 'Controle de versão em fluxos no-code', 'Estratégias de expansão']
      }
    ],
    materials: [
      {
        id: 'mat-inn-1',
        title: 'Apostila: Desenvolvimento Acelerado com Tecnologias Low-Code',
        category: 'apostila',
        format: 'PDF Impacta',
        description: 'Metodologia de inovação da Impacta para criação de aplicações corporativas conectadas a bancos de dados e APIs.',
        badge: 'Oficial Impacta'
      },
      {
        id: 'mat-inn-2',
        title: 'Guia de Boas Práticas de Integração e Governança em APIs',
        category: 'livro',
        format: 'Guia Corporativo',
        description: 'Padrões de segurança para trânsito de payloads, autenticação via Bearer Tokens e monitoramento.',
        badge: 'Referência Técnica'
      },
      {
        id: 'mat-inn-3',
        title: 'Laboratório Prático: Automação de Processos com Webhooks',
        category: 'laboratorio',
        format: 'Repositório & Coleção Postman',
        description: 'Coleção de requisições de teste e endpoints simulados para validação de automação em tempo real.',
        badge: 'Laboratório'
      },
      {
        id: 'mat-inn-4',
        title: 'Canvas de Validação de MVP e Prototipação Ágil',
        category: 'cheatsheet',
        format: 'Template Interativo',
        description: 'Framework visual para estruturação do MVP antes do início do desenvolvimento.',
        badge: 'Framework'
      }
    ],
    evaluations: [
      { id: 'ev-13', name: 'Wireframe & Protótipo Funcional', date: '22/08', weight: 20, status: 'completed', grade: 10.0 },
      { id: 'ev-14', name: 'Avaliação Parcial MVP (Entrega Funcional em Produção)', date: '08/09', weight: 40, status: 'pending' },
      { id: 'ev-15', name: 'Pitch Final para Banca Examinadora', date: '28/11', weight: 40, status: 'pending' }
    ]
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-mvp-01',
    title: 'Avaliação Parcial: Arquitetura C4 e Protótipo de Software',
    subjectId: 'software-engineering',
    subjectName: 'Software Engineering',
    dueDate: '2026-09-08',
    dueTime: '23:59',
    priority: 'critica',
    status: 'in_progress',
    type: 'avaliacao',
    isCriticalMvp: false,
    scoreWeight: 'Peso 40% na Média',
    description: 'Entrega formal do repositório Git com a estrutura do software, documentação arquitetural no padrão C4 e vídeo de demonstração do fluxo crítico para o Prof. Fábio Nogueira.'
  },
  {
    id: 'task-mvp-02',
    title: 'Avaliação Parcial MVP: Validação e Teste do Fluxo Low-Code em Produção',
    subjectId: 'innovation-lab',
    subjectName: 'Innovation Lab: Advanced No/Low Code',
    dueDate: '2026-09-08',
    dueTime: '20:00',
    priority: 'critica',
    status: 'in_progress',
    type: 'avaliacao_mvp',
    isCriticalMvp: true,
    scoreWeight: 'Peso 40% na Média',
    description: 'Apresentação do MVP automatizado rodando em ambiente de homologação, com captura de webhooks, integração de APIs REST e validação da hipótese de negócio com usuários reais.'
  },
  {
    id: 'task-mvp-03',
    title: 'Avaliação Parcial: Esquema Relacional 3FN e Consultas Complexas',
    subjectId: 'database-design',
    subjectName: 'Database Design',
    dueDate: '2026-09-10',
    dueTime: '21:00',
    priority: 'critica',
    status: 'todo',
    type: 'avaliacao',
    isCriticalMvp: false,
    scoreWeight: 'Peso 40% na Média',
    description: 'Submissão do Diagrama Lógico Relacional normalizado até a 3ª Forma Normal com scripts DDL/DML e testes de integridade para a banca de dados do Prof. Evandro.'
  },
  {
    id: 'task-04',
    title: 'Exercício Prático: Junções INNER e LEFT JOIN com Agrupamento',
    subjectId: 'sql-fundamentals',
    subjectName: 'SQL Fundamentals',
    dueDate: '2026-09-07',
    dueTime: '23:59',
    priority: 'alta',
    status: 'completed',
    type: 'exercicio',
    isCriticalMvp: false,
    description: 'Resolver bateria de 10 exercícios práticos envolvendo junções entre tabelas de vendas, clientes e itens de pedido com agrupamento GROUP BY e HAVING.'
  },
  {
    id: 'task-05',
    title: 'Lista de Exercícios: Algoritmos de Ordenação e Análise Big-O',
    subjectId: 'programming-algorithms',
    subjectName: 'Programming & Algorithms',
    dueDate: '2026-09-12',
    dueTime: '18:00',
    priority: 'alta',
    status: 'in_progress',
    type: 'lista',
    isCriticalMvp: false,
    description: 'Implementar comparativo de desempenho e contagem de comparações entre QuickSort, MergeSort e InsertionSort para as turmas dos professores Odair e João Roberto.'
  },
  {
    id: 'task-06',
    title: 'Leitura Complementar: Princípios SOLID e Clean Architecture (Cap. 5)',
    subjectId: 'software-engineering',
    subjectName: 'Software Engineering',
    dueDate: '2026-09-14',
    dueTime: '22:00',
    priority: 'media',
    status: 'todo',
    type: 'leitura',
    isCriticalMvp: false,
    description: 'Fichamento dos conceitos de Inversão de Dependência (DIP) e Segregação de Interfaces (ISP) para debate em sala com o Prof. Fábio Nogueira.'
  },
  {
    id: 'task-07',
    title: 'Laboratório Prático: Análise de Planos de Execução (Explain Plan)',
    subjectId: 'sql-fundamentals',
    subjectName: 'SQL Fundamentals',
    dueDate: '2026-09-15',
    dueTime: '21:00',
    priority: 'media',
    status: 'todo',
    type: 'laboratorio',
    isCriticalMvp: false,
    description: 'Executar análise de custo de queries com e sem índices compostos no PostgreSQL para medir redução de leituras sequenciais (Seq Scan).'
  },
  {
    id: 'task-08',
    title: 'Exercício Prático: Implementação de Busca Binária Recursiva',
    subjectId: 'programming-algorithms',
    subjectName: 'Programming & Algorithms',
    dueDate: '2026-09-16',
    dueTime: '23:59',
    priority: 'baixa',
    status: 'todo',
    type: 'exercicio',
    isCriticalMvp: false,
    description: 'Codificar a versão recursiva e iterativa da busca binária em vetor ordenado com cálculo explícito da profundidade da pilha de chamadas.'
  },
  {
    id: 'task-09',
    title: 'Lista de Exercícios: Identificação de Dependências Funcionais',
    subjectId: 'database-design',
    subjectName: 'Database Design',
    dueDate: '2026-09-18',
    dueTime: '20:00',
    priority: 'media',
    status: 'todo',
    type: 'lista',
    isCriticalMvp: false,
    description: 'Identificar chaves candidatas e dependências transitivas em 5 cenários corporativos para garantir aderência às regras da 3ª Forma Normal.'
  },
  {
    id: 'task-10',
    title: 'Leitura Complementar: Governança e Segurança em Ecossistemas Low-Code',
    subjectId: 'innovation-lab',
    subjectName: 'Innovation Lab: Advanced No/Low Code',
    dueDate: '2026-09-20',
    dueTime: '23:59',
    priority: 'baixa',
    status: 'todo',
    type: 'leitura',
    isCriticalMvp: false,
    description: 'Artigo sobre boas práticas de gerenciamento de chaves de API, controle de versionamento e conformidade com LGPD.'
  }
];
