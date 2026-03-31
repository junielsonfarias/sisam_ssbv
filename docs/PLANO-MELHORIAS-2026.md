# Plano de Melhorias — SISAM / Gestor Escolar 2026

**Data:** 28/03/2026
**Versão:** 1.0
**Total de melhorias:** 24 itens

---

## Classificação por Complexidade

| Nível | Descrição | Estimativa |
|---|---|---|
| **1 - Baixa** | Usa estruturas existentes, poucas telas, sem nova tabela complexa | 1 sessão |
| **2 - Média** | Nova tabela, 2-4 telas, API nova, lógica moderada | 1-2 sessões |
| **3 - Alta** | Múltiplas tabelas, 5+ telas, lógica complexa, integrações | 2-3 sessões |
| **4 - Muito Alta** | Módulo completo, fluxo multi-etapa, frontend + backend pesado | 3+ sessões |

---

## NÍVEL 1 — COMPLEXIDADE BAIXA (7 itens)

### 1.1 Ficha de Matrícula em PDF
**Prioridade:** Alta | **Dependência:** Nenhuma
- Gerar PDF com dados do aluno já cadastrado (nome, CPF, nascimento, responsável, endereço)
- Termo de compromisso para assinatura
- Botão "Imprimir Ficha" na tela de cadastro do aluno
- **Arquivos:** Função de geração PDF no service de alunos + botão no frontend
- **Reuso:** Dados já existem na tabela `alunos` (campos complementares já cadastrados)

### 1.2 Exportação de Dados CSV/Excel
**Prioridade:** Média | **Dependência:** Nenhuma
- Botão "Exportar" nas telas de listagem (alunos, turmas, resultados, frequência)
- Gerar CSV no backend, download no frontend
- Filtros aplicados na tela são respeitados na exportação
- **Arquivos:** Utility `lib/export-csv.ts` + botões nas telas existentes
- **Reuso:** Dados já disponíveis nas APIs de listagem

### 1.3 Relatório de Desempenho por Turma (Professor)
**Prioridade:** Média | **Dependência:** Portal do Professor existente
- Visão do professor: média por disciplina da turma, alunos abaixo da média
- Gráfico de distribuição de notas (barras)
- Comparativo entre turmas do mesmo professor
- **Arquivos:** Nova aba ou card no dashboard do professor
- **Reuso:** `notas_escolares`, `resultados_consolidados`, gráficos existentes (recharts)

### 1.4 Painel de Infrequência (Tela)
**Prioridade:** Alta | **Dependência:** API já existe (`/api/admin/infrequencia`)
- Tela dedicada `/admin/infrequencia` com listagem de alunos infrequentes
- Filtros: escola, turma, período, % frequência
- Alertas visuais (vermelho <75%, amarelo <85%)
- Ação: marcar para busca ativa
- **Arquivos:** 1 página nova + componentes de filtro
- **Reuso:** API `/api/admin/infrequencia` já retorna dados, só falta interface

### 1.5 Fila de Espera e Controle de Vagas (Interface)
**Prioridade:** Média | **Dependência:** Tabela `fila_espera` já existe
- Tela para escola/polo gerenciar fila de espera por turma
- Aprovar/rejeitar candidatos, ordenar por data
- Indicador de vagas disponíveis por turma (capacidade - matriculados)
- **Arquivos:** 1 página + API route
- **Reuso:** Tabela `fila_espera` e campo `capacidade_maxima` nas turmas

### 1.6 Calendário Escolar Interativo
**Prioridade:** Baixa | **Dependência:** `periodos_letivos` existente
- Visualização de calendário mensal com dias letivos, feriados, recesso
- Contagem automática de dias letivos por bimestre
- Cores por tipo: aula (verde), feriado (vermelho), recesso (cinza)
- **Arquivos:** 1 componente calendário + API para eventos
- **Reuso:** `periodos_letivos` já tem datas de início/fim dos bimestres

### 1.7 Log de Atividades Expandido
**Prioridade:** Média | **Dependência:** Tabela `logs_acesso` existente
- Expandir logging: registrar alteração de notas, transferências, exclusão de alunos
- Tela de auditoria com filtros (usuário, data, tipo de ação)
- Reutilizar `logs_acesso` ou criar `logs_auditoria` com mais campos
- **Arquivos:** Migration para expandir tabela + tela `/admin/auditoria`
- **Reuso:** `createLogger` já existe, `logs_acesso` já registra logins

---

## NÍVEL 2 — COMPLEXIDADE MÉDIA (8 itens)

### 2.1 Dashboard Executivo para o Secretário
**Prioridade:** Alta | **Dependência:** Dados já existem
- Página `/admin/executivo` com visão consolidada
- KPIs: total alunos, frequência média, desempenho SISAM médio, escolas com problemas
- Alertas: escola com frequência <75%, turma sem professor, turma com superlotação
- Comparativo mensal/bimestral com gráfico de tendência
- Ranking de escolas por desempenho
- **Arquivos:** 1 página + 1 API route + componentes de cards/gráficos
- **Reuso:** `estatisticas.service.ts`, `graficos.service.ts`, `dashboard.service.ts`

### 2.2 Histórico Escolar Completo (PDF)
**Prioridade:** Alta | **Dependência:** Dados de notas/frequência por bimestre
- Gerar histórico escolar oficial em PDF
- Todas as séries cursadas com notas por disciplina e situação final
- Cabeçalho da escola, assinatura do diretor/secretário
- Layout conforme modelo oficial da SEMED
- **Arquivos:** Service `historicoEscolar.service.ts` (já existe parcial) + geração PDF
- **Reuso:** `notas_escolares`, `frequencia_bimestral`, `historico_situacao`

### 2.3 Relatório Individual do Aluno (PDF SISAM)
**Prioridade:** Alta | **Dependência:** Resultados SISAM existentes
- PDF com desempenho do aluno na avaliação SISAM
- Gráfico radar por disciplina, evolução por ano
- Nível de aprendizagem (já calculado no sistema)
- Download individual ou em lote por turma
- **Arquivos:** Rota de geração PDF + componente de visualização
- **Reuso:** `resultados_consolidados`, `AbaEvolucao` como referência visual

### 2.4 Painel de Evolução por Escola (SISAM)
**Prioridade:** Média | **Dependência:** Dados SISAM 2025+2026
- Gráfico comparativo da média por escola ao longo dos anos
- Ranking com indicador de melhora/piora (seta verde/vermelha)
- Filtro por série, disciplina, polo
- Top 5 escolas que mais evoluíram
- **Arquivos:** 1 página `/admin/evolucao-escolas` + API
- **Reuso:** `resultados_consolidados` multi-ano, `graficos.service.ts`

### 2.5 Gestão de Professores (Cadastro Completo)
**Prioridade:** Alta | **Dependência:** Tabela `professor_turmas` existente
- Tela de cadastro completo: formação, lotação, carga horária, disciplinas
- Vínculo professor-disciplina-turma com interface visual
- Controle de afastamentos e substituições
- Lista de professores por escola/polo
- **Arquivos:** Expandir tabela `usuarios` (campos professor) + tela de gestão
- **Reuso:** `professor_turmas`, `disciplinas_escolares`

### 2.6 Comunicação Professor-Responsável
**Prioridade:** Média | **Dependência:** Portal do Professor
- Mural de recados por turma (professor publica, pais visualizam)
- Notificação automática de faltas excessivas (>3 consecutivas ou <75%)
- Bilhete digital: professor envia, responsável visualiza via boletim online
- **Arquivos:** Nova tabela `comunicados_turma` + API + tela no portal professor + visualização pública
- **Reuso:** Consulta de boletim `/boletim` como canal de entrega

### 2.7 Indicadores e Metas por Escola
**Prioridade:** Média | **Dependência:** Dados de frequência/notas
- Definir metas anuais por escola (frequência ≥90%, média SISAM ≥6, etc.)
- Semáforo visual: verde (atingiu), amarelo (perto), vermelho (longe)
- Relatório de cumprimento de metas por período/bimestre
- **Arquivos:** Nova tabela `metas_escola` + tela de configuração + dashboard
- **Reuso:** `estatisticas.service.ts`, KPI patterns existentes

### 2.8 Agenda de Eventos Públicos
**Prioridade:** Baixa | **Dependência:** Site institucional
- Calendário público de eventos da SEMED no site
- Tipos: reunião, formatura, jogos escolares, capacitação
- Publicador ou editor pode criar eventos
- Página pública `/eventos` com calendário visual
- **Arquivos:** Tabela `eventos` + API + página pública + seção no site
- **Reuso:** Padrão de publicações (módulo recém-criado)

---

## NÍVEL 3 — COMPLEXIDADE ALTA (6 itens)

### 3.1 Diário de Classe Digital
**Prioridade:** Alta | **Dependência:** Portal do Professor + turmas
- Registro de conteúdo ministrado por aula (data, disciplina, conteúdo, observações)
- Vinculado ao professor, turma e período letivo
- Substituir diário de papel
- Visualização por semana/mês
- Coordenador pode consultar diários de todas as turmas
- **Arquivos:** Tabela `diario_classe` + API CRUD + página no portal professor + visualização admin
- **Reuso:** `professor_turmas`, `disciplinas_escolares`, `periodos_letivos`

### 3.2 Transparência Escolar (Página Pública)
**Prioridade:** Média | **Dependência:** Dados de escolas/alunos
- Página pública `/transparencia` com dados por escola
- Total de alunos, turmas, professores, séries oferecidas
- Mapa interativo com localização das escolas (latitude/longitude já na tabela)
- Dados do censo escolar, infraestrutura (campos INEP já existem)
- Gráficos comparativos entre escolas
- **Arquivos:** Página pública + API de dados agregados + componente de mapa
- **Reuso:** Campos INEP já nas tabelas `escolas` e `alunos` (infraestrutura, localização)

### 3.3 Ouvidoria Digital
**Prioridade:** Média | **Dependência:** Site institucional
- Formulário público: tipo (denúncia, sugestão, elogio, reclamação), descrição, escola
- Protocolo gerado automaticamente para acompanhamento
- Painel interno SEMED para gerenciar demandas (status: aberto, em análise, respondido, encerrado)
- Resposta ao cidadão via consulta de protocolo
- **Arquivos:** Tabela `ouvidoria` + API pública + API admin + página pública + painel admin
- **Reuso:** Padrão de publicações para o CRUD admin

### 3.4 Relatórios para Conselhos (CACSFUNDEB, CAE, CME)
**Prioridade:** Média | **Dependência:** Dados de matrícula/frequência completos
- Relatórios formatados conforme exigência de cada conselho
- CACSFUNDEB: dados de matrícula, frequência, aplicação de recursos
- CAE: dados de merenda, alunos atendidos
- CME: dados pedagógicos, aprovação/reprovação
- Exportação em PDF com cabeçalho oficial
- **Arquivos:** Service de relatórios por conselho + geração PDF + tela admin
- **Reuso:** Todos os dados já no banco, apenas formatação específica

### 3.5 Planejamento de Aulas (Professor)
**Prioridade:** Baixa | **Dependência:** Portal do Professor + Diário de Classe
- Plano de aula semanal/mensal vinculado à turma e disciplina
- Campos: objetivo, conteúdo, metodologia, recursos, avaliação
- Biblioteca de planos compartilhados entre professores da mesma série
- Coordenador pode aprovar/comentar planos
- **Arquivos:** Tabela `planos_aula` + API + página no portal professor
- **Reuso:** `professor_turmas`, `disciplinas_escolares`

### 3.6 Modo Offline Aprimorado (Sync Queue)
**Prioridade:** Baixa | **Dependência:** PWA existente
- Fila de sincronização para dados inseridos offline (frequência, notas)
- Indicador visual de pendências no header
- Resolução de conflitos quando volta online (último ganha ou merge)
- Background Sync API do Service Worker
- **Arquivos:** `lib/offline-sync-queue.ts` + UI de status + SW handler
- **Reuso:** `lib/offline-storage.ts`, `lib/professor-db.ts`, service worker existente

---

## NÍVEL 4 — COMPLEXIDADE MUITO ALTA (3 itens)

### 4.1 Matrículas Online (Pré-Matrícula Pública)
**Prioridade:** Muito Alta | **Dependência:** Fila de espera + controle de vagas
- Formulário público de pré-matrícula no site
- Pais preenchem: dados do aluno, responsável, endereço, escola pretendida, série
- Upload de documentos (certidão de nascimento, comprovante de residência)
- Gera protocolo de acompanhamento
- Fila por escola/série com ordem cronológica
- Painel SEMED/Escola para aprovar, rejeitar ou encaminhar
- Notificação por email ao responsável sobre status
- **Arquivos:** 5+ tabelas, 10+ rotas API, 4+ páginas (pública + admin + escola)
- **Reuso:** `fila_espera`, `alunos`, `escolas`, `turmas`

### 4.2 Gabaritos e Cartão-Resposta Digital (OCR)
**Prioridade:** Média | **Dependência:** Módulo SISAM + câmera
- Leitura de cartão-resposta via câmera do celular
- Processamento de imagem (OCR) para identificar marcações
- Validação e correção manual quando OCR não tem certeza
- Integração com importação de resultados existente
- **Arquivos:** Biblioteca OCR + componente de câmera + processamento + API
- **Reuso:** `importacao.service.ts`, `resultados_consolidados`

### 4.3 App PWA para Pais/Responsáveis
**Prioridade:** Média | **Dependência:** Boletim online + frequência
- Consulta de boletim com push notification de notas
- Frequência do filho em tempo real
- Comunicados da escola/professor
- Calendário de provas e eventos
- Perfil do aluno com dados escolares
- **Arquivos:** Novo módulo completo (layout + páginas + APIs + push notifications)
- **Reuso:** `/boletim`, `notas_escolares`, `frequencia_diaria`, `comunicados_turma`

---

## ROADMAP SUGERIDO

### Sprint 1 — Fundação (Próximas sessões)
| # | Item | Nível |
|---|---|---|
| 1.1 | Ficha de Matrícula em PDF | 1 |
| 1.2 | Exportação CSV/Excel | 1 |
| 1.4 | Painel de Infrequência | 1 |
| 1.7 | Log de Atividades Expandido | 1 |

### Sprint 2 — Gestão Pedagógica
| # | Item | Nível |
|---|---|---|
| 2.1 | Dashboard Executivo | 2 |
| 2.2 | Histórico Escolar PDF | 2 |
| 1.3 | Relatório Desempenho Turma | 1 |
| 2.5 | Gestão de Professores | 2 |

### Sprint 3 — SISAM + Relatórios
| # | Item | Nível |
|---|---|---|
| 2.3 | Relatório Individual SISAM PDF | 2 |
| 2.4 | Painel Evolução por Escola | 2 |
| 3.4 | Relatórios para Conselhos | 3 |
| 2.7 | Indicadores e Metas | 2 |

### Sprint 4 — Professor + Comunicação
| # | Item | Nível |
|---|---|---|
| 3.1 | Diário de Classe Digital | 3 |
| 2.6 | Comunicação Professor-Responsável | 2 |
| 3.5 | Planejamento de Aulas | 3 |
| 1.5 | Fila de Espera (Interface) | 1 |

### Sprint 5 — Site Público + Transparência
| # | Item | Nível |
|---|---|---|
| 3.2 | Transparência Escolar | 3 |
| 3.3 | Ouvidoria Digital | 3 |
| 2.8 | Agenda de Eventos | 2 |
| 1.6 | Calendário Escolar | 1 |

### Sprint 6 — Grandes Módulos
| # | Item | Nível |
|---|---|---|
| 4.1 | Matrículas Online | 4 |
| 4.2 | Cartão-Resposta OCR | 4 |
| 4.3 | App PWA para Pais | 4 |
| 3.6 | Offline Aprimorado | 3 |

---

## RESUMO

| Complexidade | Quantidade | Sessões estimadas |
|---|---|---|
| Nível 1 (Baixa) | 7 | ~7 sessões |
| Nível 2 (Média) | 8 | ~12 sessões |
| Nível 3 (Alta) | 6 | ~15 sessões |
| Nível 4 (Muito Alta) | 3 | ~12 sessões |
| **Total** | **24 itens** | **~46 sessões** |
