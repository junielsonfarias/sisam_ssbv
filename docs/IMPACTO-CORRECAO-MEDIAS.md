# Impacto da Correção do Sistema de Cálculo de Médias

**Data**: 10/02/2026
**Status**: Pendente de aprovação

---

## Regra de Negócio Correta

- **Média do aluno**: soma das notas das disciplinas / nº de disciplinas (divisor fixo)
  - Anos iniciais (2º, 3º, 5º): `(LP + MAT + PROD) / 3`
  - Anos finais (6º, 7º, 8º, 9º): `(LP + CH + MAT + CN) / 4`
- **Nota 0**: entra no cálculo como 0 (não é ignorada)
- **Média da turma por disciplina**: soma das notas da disciplina de todos os alunos presentes / total de alunos presentes
- **Média da turma**: soma das médias por disciplina / nº de disciplinas
  - Exemplo 3º ano: `(Média LP + Média MAT + Média PROD) / 3`

---

## Item 1 — Tabela de Turmas (painel-dados.tsx)

**Arquivo**: `components/painel-dados.tsx` linhas 1228-1249
**Problema**: A coluna MEDIA usava `turma.media_geral` do backend (AVG das médias individuais dos alunos)
**Correção**: Calcular no frontend como `(media_lp + media_mat + media_prod) / 3` para anos iniciais ou `(media_lp + media_mat + media_ch + media_cn) / 4` para anos finais
**Status**: JÁ APLICADO

### Impacto

A prova matemática confirmou que os dois métodos são **matematicamente equivalentes** para todas as 132 turmas quando COALESCE é usado (nota 0 = 0). As diferenças encontradas são apenas de arredondamento (máximo 0.01).

| Turmas analisadas | Com diferença >= 0.01 | Sem diferença | Mudança de ranking |
|---|---|---|---|
| 132 | 12 | 120 | Nenhuma significativa |

**Exemplos de diferença (arredondamento)**:

| Turma | Escola | Série | Média Atual | Média Corrigida | Diferença |
|---|---|---|---|---|---|
| F2M901 | EMEIF SÃO LUCAS | 2º Ano | 6.23 | 6.22 | -0.01 |
| F5M902 | EMEB EMMANOEL LOBATO | 5º Ano | 5.79 | 5.80 | +0.01 |
| F9T901 | EMEIF RAQUEL | 9º Ano | 3.77 | 3.76 | -0.01 |

---

## Item 2 — Card "Média Geral" na aba Visão Geral (painel-dados.tsx)

**Arquivo**: `components/painel-dados.tsx` linha 745
**Problema**: Usa `mediaGeralCalculada = estatisticas.mediaGeral` que vem do `estatisticas.service.ts` (AVG das médias individuais dos alunos presentes)
**Correção necessária**: Calcular como `(mediaLp + mediaMat + ...) / nº disciplinas` a partir das médias por disciplina que já vêm do backend
**Status**: PENDENTE

### Impacto

- **Sem impacto real** — matematicamente equivalente ao método atual quando COALESCE é usado
- Diferença máxima esperada: 0.01 (arredondamento)
- Sem mudança visual perceptível para o usuário

---

## Item 3 — Card "Média Geral" na aba Análises (painel-dados.tsx)

**Arquivo**: `components/painel-dados.tsx` linhas 1929-1930
**Problema**: Mesmo que item 2 — usa `mediaGeralCalculada` do backend
**Correção necessária**: Mesmo que item 2
**Status**: PENDENTE

### Impacto

- **Sem impacto real** — mesmo valor do item 2
- Sem mudança visual perceptível

---

## Item 4 — Card "Média Geral" no painel-analise.tsx

**Arquivo**: `components/painel-analise.tsx` linha 665
**Problema**: Usa `mediaGeralCalculada = estatisticasAPI.mediaGeral` que vem de `resultados-consolidados/route.ts` (AVG das médias individuais)
**Correção necessária**: Calcular a partir das médias por disciplina que já vêm nas estatísticas da API
**Status**: PENDENTE

### Impacto

- **Sem impacto real** — matematicamente equivalente
- Este componente é usado por TODOS os tipos de usuário (admin, tecnico, polo, escola)
- Sem mudança visual perceptível

---

## Item 5 — Modal de Alunos da Turma (modal-alunos-turma.tsx)

**Arquivo**: `components/modal-alunos-turma.tsx` linha 144
**Problema**: Calcula `mediaGeral` como `AVG(media_aluno)` onde `media_aluno` vem do banco de dados. O campo `media_aluno` armazenado usa **divisor dinâmico** (divide apenas pelas disciplinas com nota > 0), não divisor fixo.
**Correção necessária**: Recalcular a média do aluno usando divisor fixo a partir das notas individuais, ou corrigir o valor armazenado no banco via endpoint `/api/admin/recalcular-niveis`
**Status**: PENDENTE

### Impacto

| Total de alunos presentes | Alunos afetados | Percentual |
|---|---|---|
| 2.329 | 178 | 7,6% |

**Os 178 alunos afetados são aqueles com nota 0 em uma ou mais disciplinas.** O banco armazena a média apenas das disciplinas com nota > 0, inflando o resultado.

**Maiores diferenças encontradas**:

| Aluno | Série | LP | MAT | PROD | Média Banco | Média Correta | Diferença |
|---|---|---|---|---|---|---|---|
| REYLLA ANGELICK DOS SANTOS SOARES | 2º Ano | 0.00 | 7.14 | 0.00 | 7.14 | 2.38 | +4.76 |
| ISAAC VALE DA COSTA | 3º Ano | 0.00 | 6.43 | 0.00 | 6.43 | 2.14 | +4.29 |
| JORGE NETO DA COSTA DA COSTA | 3º Ano | 0.00 | 6.43 | 0.00 | 6.43 | 2.14 | +4.29 |
| MARIA VITORIA DA SILVA TEIXEIRA | 2º Ano | 0.00 | 5.00 | 0.00 | 5.00 | 1.67 | +3.33 |
| AUGUSTO JUNIOR DA CONCEICAO FERREIRA | 9º Ano | 6.00 | 0.00 | - | 6.50 | 3.25 | +3.25 |
| DAVID JAYLLER TAVARES DOS SANTOS | 2º Ano | 8.57 | 9.29 | 0.00 | 8.93 | 5.95 | +2.98 |
| WILLIAN DE LIMA DE SOUZA | 5º Ano | 7.86 | 9.50 | 0.00 | 8.68 | 5.79 | +2.89 |

**Exemplo explicativo**:
REYLLA tem LP=0, MAT=7.14, PROD=0.
- Banco (divisor dinâmico): `7.14 / 1 = 7.14` (ignora as duas disciplinas com 0)
- Correto (divisor fixo): `(0 + 7.14 + 0) / 3 = 2.38`

---

## Item 6 — Endpoint de Escolas (escolas/route.ts)

**Arquivo**: `app/api/admin/escolas/route.ts` linhas 150-154
**Problema**: Médias por disciplina usam `nota > 0` (exclui zeros), enquanto turmas e resultados-consolidados já usam `COALESCE(nota, 0)` (inclui zeros)
**Correção necessária**: Alterar de `AVG(CASE WHEN nota > 0 THEN nota ELSE NULL END)` para `AVG(CASE WHEN presenca='P' THEN COALESCE(nota, 0) ELSE NULL END)`
**Status**: PENDENTE

### Impacto

| Total de escolas | Escolas afetadas | Percentual |
|---|---|---|
| 24 | 17 | 70,8% |

**Todas as médias por disciplina vão DIMINUIR** (porque zeros passam a entrar no cálculo).

**Escolas com maiores diferenças**:

| Escola | Disciplina | Média Atual | Média Corrigida | Diferença |
|---|---|---|---|---|
| EMEIF BOM JARDIM | MAT | 6.36 | 5.30 | -1.06 |
| EMEIF SÃO LUCAS | MAT | 5.20 | 4.33 | -0.87 |
| EMEIF MALOCA | MAT | 5.35 | 5.01 | -0.34 |
| EMEF PDE JOSÉ DE ANCHIETA | MAT | 5.08 | 4.88 | -0.20 |
| EMEIF CAETÉ | MAT | 5.50 | 5.31 | -0.19 |
| EMEF NOSSA SRA DE LOURDES | MAT | 5.27 | 5.10 | -0.17 |
| EMEIF CUSTÓDIO FERREIRA | LP | 6.10 | 5.95 | -0.15 |
| EMEB EMMANOEL LOBATO | MAT | 4.67 | 4.54 | -0.13 |
| EMEIF CRUZEIRO | MAT | 4.54 | 4.44 | -0.10 |
| EMEIF HAYDEE MAIA | MAT | 4.79 | 4.69 | -0.10 |

**Detalhamento completo LP e MAT por escola**:

| Escola | LP Atual | LP Corrigida | Dif LP | MAT Atual | MAT Corrigida | Dif MAT |
|---|---|---|---|---|---|---|
| EMEB EMMANOEL LOBATO | 5.20 | 5.15 | -0.05 | 4.67 | 4.54 | -0.13 |
| EMEF MAGALHÃES BARATA | 5.42 | 5.41 | -0.01 | 4.62 | 4.53 | -0.09 |
| EMEF NOSSA SRA DE LOURDES | 5.38 | 5.38 | 0.00 | 5.27 | 5.10 | -0.17 |
| EMEF PDE JOSÉ DE ANCHIETA | 5.69 | 5.66 | -0.03 | 5.08 | 4.88 | -0.20 |
| EMEF VER. ENGRÁCIO | 5.26 | 5.19 | -0.07 | 4.47 | 4.41 | -0.06 |
| EMEIF ALACID NUNES | 4.72 | 4.72 | 0.00 | 3.07 | 3.02 | -0.05 |
| EMEIF BOM JARDIM | 5.12 | 5.12 | 0.00 | 6.36 | 5.30 | -1.06 |
| EMEIF CAETÉ | 6.31 | 6.31 | 0.00 | 5.50 | 5.31 | -0.19 |
| EMEIF CASTANHAL | 4.68 | 4.68 | 0.00 | 4.11 | 4.11 | 0.00 |
| EMEIF CRUZEIRO | 5.57 | 5.51 | -0.06 | 4.54 | 4.44 | -0.10 |
| EMEIF CUSTÓDIO FERREIRA | 6.10 | 5.95 | -0.15 | 5.26 | 5.26 | 0.00 |
| EMEIF HAYDEE MAIA | 5.49 | 5.49 | 0.00 | 4.79 | 4.69 | -0.10 |
| EMEIF INDEPENDÊNCIA | 4.42 | 4.42 | 0.00 | 3.31 | 3.23 | -0.08 |
| EMEIF MALOCA | 4.75 | 4.75 | 0.00 | 5.35 | 5.01 | -0.34 |
| EMEIF MANOEL R. PINHEIRO | 4.61 | 4.61 | 0.00 | 3.90 | 3.90 | 0.00 |
| EMEIF PADRE SILVÉRIO | 5.31 | 5.31 | 0.00 | 4.61 | 4.61 | 0.00 |
| EMEIF PEDRO NOGUEIRA | 4.76 | 4.76 | 0.00 | 4.05 | 3.98 | -0.07 |
| EMEIF RAQUEL | 4.81 | 4.81 | 0.00 | 3.79 | 3.75 | -0.04 |
| EMEIF REI SALOMÃO | 5.40 | 5.40 | 0.00 | 5.06 | 5.06 | 0.00 |
| EMEIF SÃO BENEDITO | 5.50 | 5.50 | 0.00 | 2.41 | 2.41 | 0.00 |
| EMEIF SÃO FÉLIX | 3.70 | 3.70 | 0.00 | 6.01 | 6.01 | 0.00 |
| EMEIF SÃO JOSÉ | 5.01 | 5.01 | 0.00 | 4.46 | 4.40 | -0.06 |
| EMEIF SÃO LUCAS | 5.64 | 5.64 | 0.00 | 5.20 | 4.33 | -0.87 |
| EMEIF SÃO MARCOS | 6.29 | 6.29 | 0.00 | 5.72 | 5.72 | 0.00 |

---

## Item 7 — Relatório do Polo (RelatorioPoloWeb.tsx)

**Arquivo**: `components/relatorios/RelatorioPoloWeb.tsx` linhas 251-259, 385, 409, 528
**Problema**: Usa `escola.media_geral` e `estatisticas.media_geral` do backend (AVG das médias individuais)
**Correção necessária**: Calcular a partir das médias por disciplina
**Status**: PENDENTE

### Impacto

- **Sem impacto real** — matematicamente equivalente ao método atual
- Diferença máxima esperada: 0.01 (arredondamento)
- Sem mudança visual no relatório

---

## Resumo Geral

| Item | Local | Impacto | Risco |
|---|---|---|---|
| 1 | Tabela Turmas (painel-dados) | Nenhum (arredondamento 0.01) | NULO — JÁ APLICADO |
| 2 | Card Visão Geral (painel-dados) | Nenhum (equivalente) | NULO |
| 3 | Card Análises (painel-dados) | Nenhum (equivalente) | NULO |
| 4 | Card Média Geral (painel-analise) | Nenhum (equivalente) | NULO |
| 5 | Modal Alunos Turma | **178 alunos (7.6%)** com média inflada | **ALTO** |
| 6 | Tabela Escolas (escolas/route.ts) | **17 escolas (70.8%)** com médias infladas | **MODERADO** |
| 7 | Relatório Polo | Nenhum (equivalente) | NULO |

### Ações necessárias por prioridade

1. **Item 6** — Corrigir `escolas/route.ts` para usar `COALESCE(nota, 0)` ao invés de `nota > 0`
2. **Item 5** — Corrigir `modal-alunos-turma.tsx` para recalcular média com divisor fixo (e/ou atualizar `media_aluno` no banco via recalcular-niveis)
3. **Items 2, 3, 4** — Calcular mediaGeral no frontend a partir das médias por disciplina (padronização)
4. **Item 7** — Mesmo tratamento dos items 2-4 no componente de relatório
