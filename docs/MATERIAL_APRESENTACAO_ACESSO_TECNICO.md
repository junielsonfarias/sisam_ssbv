# Material de Apresentação – Acesso Técnico SISAM

## Sistema de Análise de Provas (SISAM)

Este material descreve todas as funcionalidades disponíveis para o **Acesso Técnico** no SISAM, com explicação de cada módulo e exemplos visuais das telas.

---

## 1. Visão geral do Acesso Técnico

O **usuário técnico** tem permissão ampla no sistema, com acesso a dados de **todos os polos e escolas**, sem restrição por polo ou escola. Ele pode:

- Visualizar e analisar resultados consolidados
- Comparar escolas e polos
- Consultar e editar cadastros (Polos, Escolas, Alunos)
- Importar dados via Excel (página dedicada em `/tecnico/importar`)
- Acessar relatórios e gráficos



## 2. Menu do Técnico

Após o login, o técnico é redirecionado para o **Dashboard** (`/tecnico/dashboard`) e vê no menu lateral:

| Ícone        | Módulo                  | Rota                        | Descrição resumida                            |
|------------ -|-------------------------|-----------------------------|-----------------------------------------------|
| LayoutGrid   | Dashboard               | `/tecnico/dashboard       ` | Visão geral e painel de dados                 |
| Database     | Painel de Dados         | `/admin/dados`              | Filtros e tabelas de resultados               |
| TrendingUp   | Análise Gráfica         | `/tecnico/graficos`         | Gráficos por disciplina, série, polo, escola  |
| FileText     | Resultados Consolidados | `/admin/resultados`         | Listagem de alunos com notas e níveis         |
| BarChart3    | Comparativos Escolas    | `/admin/comparativos`       | Comparativo entre escolas (médias, acertos)   |
| MapPin       | Comparativos Polo       | `/admin/comparativos-polos` | Comparativo entre polos                       |
| FileBarChart | Relatórios              | `/admin/relatorios`         | Relatórios por escola/polo (quando liberado)  |
| School       | Escolas                 | `/admin/escolas`            | Cadastro de escolas                           |
| MapPin       | Polos                   | `/admin/polos`              | Cadastro de polos                             |
| GraduationCap | Alunos                 | `/admin/alunos`             | Cadastro de alunos                            |

**Importar Dados (Excel):** o técnico tem uma tela própria em **`/tecnico/importar`**. Ela não aparece no menu lateral; o acesso é por URL direta. Nessa tela é possível enviar um arquivo Excel (.xlsx ou .xls) para importação de dados de provas.

---

## 3. Funcionalidades detalhadas

### 3.1 Dashboard (`/tecnico/dashboard`)

**O que é:** Primeira tela após o login. Mostra o **Dashboard do usuario** no contexto técnico, com estatísticas gerais e abas de navegação.

**Funcionalidades:**

- **Estatísticas gerais:** totais de escolas, polos, resultados, alunos, turmas, alunos presentes/faltantes, médias gerais e por etapa (Anos Iniciais / Anos Finais) e por disciplina (LP, CH, MAT, CN, Produção).
- **Abas:**
  - **Geral:** resumo com cards de totais e médias.
  - **Escolas:** lista de escolas com busca.
  - **Turmas:** lista de turmas com busca.
  - **Alunos:** lista de resultados consolidados por aluno, com filtros (polo, escola, turma, ano letivo, série, presença, etapa) e paginação.
  - **Análises:** visão analítica dos dados (conforme implementação do componente).

**Exemplo de uso:** Acompanhar o total de alunos avaliados e a média geral; abrir a aba Alunos e filtrar por escola ou série para analisar desempenho.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-01-dashboard.png`.

---

### 3.2 Painel de Dados (`/admin/dados`)

**O que é:** Painel único (compartilhado com outros perfis) com filtros avançados e tabelas. Para o técnico, os dados não são filtrados por polo/escola; vê tudo.

**Funcionalidades:**

- Mesmas abas do Dashboard (Geral, Escolas, Turmas, Alunos, Análises).
- Filtros por: **Polo, Escola, Turma, Ano letivo, Série, Presença, Tipo de ensino (Anos Iniciais/Finais)**.
- Na aba **Alunos:** colunas como nome, escola, turma, série, presença, acertos e notas por disciplina (LP, CH, MAT, CN), média, nível de aprendizagem; possibilidade de abrir detalhes por aluno (questões).
- Exibição de **níveis de aprendizagem** (ex.: Avançado, Adequado, Básico, Insuficiente) quando houver configuração por série/disciplina.
- Suporte a **modo offline** (leitura de dados em cache quando aplicável).

**Exemplo de uso:** Filtrar por um polo e uma série para ver só os alunos daquele contexto; clicar em um aluno para ver o desempenho por questão.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-02-painel-dados.png`.

---

### 3.3 Análise Gráfica (`/tecnico/graficos`)

**O que é:** Tela de gráficos para visualizar desempenho por disciplina, série, polo, escola e turma.

**Funcionalidades:**

- **Filtros:** Ano letivo, Polo, Escola, Série, Disciplina, Turma, Etapa de ensino (Anos Iniciais / Anos Finais).
- **Tipos de gráfico (exemplos):**
  - Barras: médias por escola, turma ou série.
  - Linha: evolução temporal (se houver dados por período).
  - Pizza: distribuição de níveis ou presença.
  - Radar: desempenho por disciplina.
- Disciplinas conforme etapa: **Anos Iniciais** (LP, MAT, Produção Textual, etc.) e **Anos Finais** (LP, CH, MAT, CN, Produção Textual).
- Técnico pode escolher qualquer polo e escola; não há restrição de visibilidade.

**Exemplo de uso:** Selecionar um ano e um polo, comparar médias de Matemática entre escolas em gráfico de barras.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-03-analise-grafica.png`.

---

### 3.4 Resultados Consolidados (`/admin/resultados`)

**O que é:** Listagem de **todos os resultados consolidados** (um registro por aluno/ano/série/turma), com filtros e detalhamento por aluno.

**Funcionalidades:**

- **Filtros:** Polo, Escola, Turma, Ano letivo, Série, Presença, Tipo de ensino.
- **Colunas típicas:** Aluno, Escola, Turma, Série, Presença, Acertos (LP, CH, MAT, CN), Notas por disciplina, Média, Nível de aprendizagem (e por disciplina quando houver).
- **Busca** por nome do aluno.
- **Paginação** para grandes volumes.
- **Detalhes do aluno:** ao clicar em um aluno, abre modal com questões (acertos por item), notas e níveis por disciplina.
- Dados podem ser carregados do cache em **modo offline**.

**Exemplo de uso:** Buscar um aluno pelo nome e ver todas as notas e o nível em cada disciplina; ou filtrar por escola e série para exportar mentalmente/analisar a turma.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-04-resultados-consolidados.png`.

---

### 3.5 Comparativos Escolas (`/admin/comparativos`)

**O que é:** Comparação de **médias e indicadores entre escolas** (e opcionalmente turmas), com possibilidade de ver melhores alunos por turma.

**Funcionalidades:**

- **Seleção:** Polo (obrigatório para filtrar escolas), Ano letivo, Série, Turma.
- **Seleção de escolas:** múltiplas escolas do(s) polo(s) selecionado(s).
- **Tabela comparativa:** por escola (e turma): total de alunos, presentes, médias (geral, LP, CH, MAT, CN, Produção), médias de acertos por disciplina.
- **Melhores alunos:** por turma, exibição dos melhores colocados (ex.: top 5).
- **Modal de alunos da turma:** ao clicar em uma turma, lista de alunos daquela turma.
- **Impressão:** recurso de impressão da tela para relatórios.

**Exemplo de uso:** Selecionar um polo, ano e série; escolher 3 escolas e comparar as médias de Matemática e Português; abrir a turma com melhor média para ver os alunos.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-05-comparativos-escolas.png`.

---

### 3.6 Comparativos Polo (`/admin/comparativos-polos`)

**O que é:** Comparação de **médias e indicadores entre polos**, com detalhamento por série e, quando aplicável, por escola.

**Funcionalidades:**

- **Seleção:** Polos (múltiplos), Ano letivo, Série, Escola, Turma.
- **Visão por polo:** totais de alunos, presentes, médias gerais e por disciplina (LP, CH, MAT, CN, Produção), médias de acertos.
- **Detalhamento por série** dentro de cada polo.
- **Detalhamento por escola** dentro do polo (quando disponível na tela).
- **Impressão** para relatórios.

**Exemplo de uso:** Comparar dois ou três polos na mesma série e ano; ver qual polo tem melhor média em Ciências da Natureza.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-06-comparativos-polos.png`.

---

### 3.7 Relatórios (`/admin/relatorios`)

**O que é:** Geração de relatórios por **escola** ou **polo** e ano letivo.

**Funcionalidades:**

- **Seletor de tipo:** Relatório por Escola ou Relatório por Polo.
- **Filtros:** Ano letivo, Polo, Escola (conforme o tipo).
- Geração de relatório em PDF (ou download) com dados consolidados do ano/polo/escola selecionados.

**Observação:** No código atual, a página de Relatórios pode exibir mensagem de “Funcionalidade em Manutenção” e estar restrita apenas a administradores. Quando liberada para técnico, o acesso será por esta mesma rota.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-07-relatorios.png`.

---

### 3.8 Escolas (`/admin/escolas`)

**O que é:** CRUD de **escolas**: listagem, busca, inclusão, edição e exclusão (ou desativação).

**Funcionalidades:**

- **Listagem:** todas as escolas (técnico vê todas), com nome, código, polo, status ativo.
- **Busca** por nome, código ou polo.
- **Incluir:** nome, código, polo (obrigatório), endereço, telefone, e-mail (conforme formulário).
- **Editar:** alterar dados da escola.
- **Excluir/Desativar:** remover ou desativar escola (conforme regra de negócio).

**Exemplo de uso:** Cadastrar uma nova escola vinculada a um polo; corrigir o nome ou o código de uma escola.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-08-escolas.png`.

---

### 3.9 Polos (`/admin/polos`)

**O que é:** CRUD de **polos**: listagem, busca, inclusão, edição e exclusão/desativação.

**Funcionalidades:**

- **Listagem:** todos os polos.
- **Busca** por nome ou código.
- **Incluir:** nome, código, descrição.
- **Editar:** alterar nome, código, descrição.
- **Excluir/Desativar:** conforme regra de negócio.

**Exemplo de uso:** Criar um novo polo regional; alterar a descrição de um polo.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-09-polos.png`.

---

### 3.10 Alunos (`/admin/alunos`)

**O que é:** CRUD de **alunos**: listagem com filtros, busca, inclusão, edição e histórico.

**Funcionalidades:**

- **Listagem:** alunos com nome, código, escola, polo, turma, série, ano letivo, ativo.
- **Filtros:** Polo, Escola, Turma, Série, Ano letivo.
- **Busca** por nome ou código (com debounce).
- **Paginação** para muitos registros.
- **Incluir:** código, nome, polo, escola, turma, série, ano letivo.
- **Editar:** alterar dados do aluno.
- **Histórico:** modal com histórico do aluno (resultados em anos/séries anteriores, quando disponível).
- **Excluir/Desativar:** conforme regra de negócio.

**Exemplo de uso:** Cadastrar aluno em uma escola/turma; corrigir turma ou série; consultar histórico de um aluno.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-10-alunos.png`.

---

### 3.11 Importar Dados (`/tecnico/importar`)

**O que é:** Tela para envio de **um arquivo Excel** com dados de provas (importação via API `/api/admin/importar`). Não aparece no menu; acesso por URL.

**Funcionalidades:**

- **Seleção de arquivo:** apenas `.xlsx` ou `.xls`.
- **Envio:** upload do arquivo; processamento no servidor.
- **Retorno:** total de linhas, linhas processadas, linhas com erro (se houver).
- **Validação:** estrutura do Excel deve conter colunas esperadas (ex.: código escola, código aluno, nome aluno, código questão, resposta, acertou, nota, data, ano letivo, série, turma, disciplina, área).

**Exemplo de uso:** Receber planilha com resultados de uma aplicação de prova; enviar pela tela e conferir a mensagem de sucesso e totais.

**Imagem de referência:** Ver `docs/apresentacao-tecnico/mockup-11-importar-dados.png`.

---



\* Relatórios podem estar temporariamente restritos só a administrador; quando liberado, técnico terá acesso.

---

## 4. Fluxo sugerido para apresentação

1. **Login** como técnico → redirecionamento para Dashboard.
2. **Dashboard:** mostrar cards de totais e abas (Geral, Escolas, Turmas, Alunos).
3. **Painel de Dados:** aplicar filtros (polo, série) e mostrar aba Alunos com níveis.
4. **Análise Gráfica:** escolher ano, polo e disciplina; exibir gráfico de barras por escola.
5. **Resultados Consolidados:** buscar um aluno e abrir o modal de questões.
6. **Comparativos Escolas:** selecionar polo e escolas; mostrar tabela e “melhores alunos”.
7. **Comparativos Polo:** selecionar polos e série; mostrar médias por polo.
8. **Escolas / Polos / Alunos:** mostrar listagem, busca e um exemplo de edição.
9. **Importar Dados:** acessar `/tecnico/importar`, mostrar tela de upload e mensagem de sucesso (com arquivo de exemplo).

---



Use essas imagens nos slides ou no documento de apresentação para ilustrar cada funcionalidade do acesso técnico.

---

*Documento gerado para o projeto SISAM – Material de Apresentação do Acesso Técnico.*
