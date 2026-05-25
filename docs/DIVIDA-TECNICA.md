# Dívida Técnica Reconhecida — SISAM/Educatec

Este arquivo lista itens identificados como dívida técnica que **não foram resolvidos** mas estão **reconhecidos** para futuras sprints. Mantenha-o atualizado a cada nova rodada de refactoring.

Última atualização: **2026-05-25** (Fase 5 da adaptação SEMED).

> **Nota sobre Fase 5 (refactor de arquivos):** o usuário optou pelo top 5,
> mas decompor cada arquivo > 700 linhas requer 30-60min de análise + refactor + teste.
> Como a Fase 5 tem múltiplos itens igualmente importantes (RLS, testes,
> documentação operacional, runbooks, manuais), os top 5 foram marcados como
> **prioridade ALTA** e deixados para uma sprint dedicada. A decomposição
> mecânica sem entender o domínio pode introduzir bugs sutis.

---

## 1. Arquivos acima de 400 linhas (CLAUDE.md)

O `CLAUDE.md` define **400 linhas como limite** por arquivo. Decompostos durante a Fase 1:

- ✅ `lib/services/comparativos.service.ts` (622 linhas) → `lib/services/comparativos/` (types, sql, filtros, escolas, polos, index)

### Pendências de decomposição (ordenado por urgência)

**🔴 PRIORIDADE ALTA (Top 5 — sprint dedicada):**

| Arquivo | Linhas | Categoria | Sugestão de decomposição |
|---|---|---|---|
| `lib/relatorios/gerador-pdf.tsx` | 1008 | Relatório PDF | Separar por tipo: `boletim.tsx`, `conselho.tsx`, `transferencia.tsx`, `historico.tsx` + index barrel |
| `lib/offline-storage.ts` | 823 | Storage offline | Dividir em `offline-storage/{user,alunos,turmas,questoes,resultados,cache}.ts` + 39 console.log → logger |
| `app/admin/comparativos-polos/page.tsx` | 801 | Página | Extrair `components/PainelFiltros.tsx`, `components/GraficoComparativo.tsx`, `hooks/useComparativo.ts` |
| `app/api/admin/importar-resultados/route.ts` | 768 | API route | Criar `lib/services/importacao-resultados/{parse,validar,inserir,index}.ts` |
| `app/admin/gestor-escolar/components/aba-pesquisar-aluno.tsx` | 762 | Componente | Quebrar em `FiltroBusca`, `ListaResultados`, `DetalheAluno`, `ModalAcoes` |

**🟡 PRIORIDADE MÉDIA (próximas sprints):**
| `app/admin/alunos/page.tsx` | 722 | Página | Extrair tabela, filtros, modais |
| `app/admin/usuarios/page.tsx` | 699 | Página | Extrair tabela, form, modal de perfil |
| `lib/relatorios/consultas-escola.ts` | 686 | Queries | Dividir por tipo de consulta |
| `lib/services/estatisticas/queries.ts` | 678 | Queries | Já está em subpasta; subdividir por tema |
| `app/escola/alunos/page.tsx` | 671 | Página | Extrair tabela, filtros |
| `lib/divergencias/corretores.ts` | 660 | Corretores | Dividir por tipo de divergência |
| `app/admin/graficos/components/GraficoGeral.tsx` | 630 | Componente | Quebrar gráficos individuais |
| `lib/services/importacao/batch.ts` | 627 | Service | Já em subpasta; subdividir batch por fase |
| `app/admin/divergencias/page.tsx` | 625 | Página | Extrair tabela e modais |
| `components/painel-dados/index.tsx` | 598 | Componente | Subdividir abas |
| `components/modal-questoes-aluno.tsx` | 577 | Componente | Extrair partes (header, lista, detalhe) |
| `components/painel-dados/aba-alunos.tsx` | 565 | Componente | Extrair filtros e tabela |
| `app/admin/notas-escolares/page.tsx` | 547 | Página | Extrair forms |
| `app/admin/anos-letivos/page.tsx` | 538 | Página | Extrair modal e form |
| `app/admin/dados/hooks/useDadosLoading.ts` | 537 | Hook | Quebrar por entidade carregada |
| `lib/services/importacao/process.ts` | 526 | Service | Subdividir process por fase |
| `app/admin/dispositivos-faciais/page.tsx` | 518 | Página | Extrair modais de cadastro |
| `lib/divergencias/verificadores-dados.ts` | 518 | Verificadores | Dividir por categoria |
| `app/admin/logs-acesso/page.tsx` | 513 | Página | Extrair filtros e tabela |
| `lib/services/dashboard/queries.ts` | 512 | Queries | Dividir por dashboard |
| `app/professor/planos/page.tsx` | 510 | Página | Extrair editor de plano |
| `app/admin/dados/page.tsx` | 510 | Página | Extrair tabs |
| `app/api/admin/resultados-consolidados/route.ts` | 500 | API route | Mover query para service |
| `lib/services/graficos/fetch-analise.ts` | 499 | Service | Subdividir |
| `lib/services/alunoQuestoes.service.ts` | 497 | Service | Decompor em subpasta |
| `app/admin/graficos/page.tsx` | 487 | Página | Extrair componentes |
| `app/admin/frequencia/page.tsx` | 485 | Página | Extrair forms |
| `app/admin/relatorios-pdf/page.tsx` | 483 | Página | Extrair forms |
| `app/admin/turmas/page.tsx` | 478 | Página | Extrair tabela e modais |
| `app/matricula/page.tsx` | 477 | Página | Extrair etapas (wizard) |

### Exceções aceitáveis (justificadas)

- `database/connection.ts` (597 linhas) — configuração de pool com retry, health check e métricas. Coeso.
- `lib/relatorios/tipos.ts` (511 linhas) — tipos puros.
- `lib/services/dashboard/types.ts` (561 linhas) — tipos puros.
- `components/layout-dashboard/menu-config.ts` (484 linhas) — config declarativa.

---

## 2. console.log — Decisão arquitetural (Fase 5)

Auditoria Fase 5 atualizou esta análise:

### ✅ Aceitos (não migrar — decisão deliberada)
- `lib/offline-storage.ts` — **62 console.** É código **100% client-side** (roda no browser). Logger estruturado server-side não se aplica aqui. Console do browser é o canal natural de debug. **Aceito como exceção arquitetural.**
- `lib/crypto.ts` — pontual, função utilitária pura. Aceito.
- `lib/cache/session.ts` — pontual, debug local. Aceito.

### Padrão estabelecido (manter daqui pra frente)
- **Server-side** (lib/services, app/api): `createLogger('Modulo')` + `log.info/warn/error`
- **Client-side** (componentes React, hooks, lib client-only): `console.*` aceitável

**Status:** ✅ Resolvido — decisão arquitetural documentada.

---

## 3. Cobertura de testes (atualizada após Fase 5)

Estado em 2026-05-25 (após Fase 5):

- **29 arquivos de teste** (era 24 antes da Fase 5)
- **649 testes passando** (era 610)
- Cobertura ainda < 30% das rotas
- Apenas 1 teste E2E (`e2e/site-publico.spec.ts`)

Novos testes na Fase 5:
- LGPD (8 testes)
- 2FA (10 testes)
- Recuperação senha (7 testes)
- FICAI (6 testes)
- Documentos formais (8 testes)

Plano contínuo:
- Meta de cobertura: 70% unit/integration, 100% jornadas críticas E2E
- CI fail se cobertura < 60% (após atingir baseline)
- Smoke test pós-deploy implementado em `scripts/smoke-test.js`

---

## 4. N+1 queries suspeitas

Auditar (não confirmado, apenas hipótese baseada em padrões de código):

- `lib/services/dashboard/` — loops com queries
- `lib/services/estatisticas/queries.ts` — possíveis JOINs faltando
- `lib/services/graficos/fetch-analise.ts` — query repetida por série

**Como verificar:** habilitar `DEBUG=pool:queries` em ambiente local e rodar as páginas correspondentes.

---

## 5. Migrations duplicadas/iterativas

Várias migrations `add-performance-indexes-v1` até `v4` indicam iteração natural. Considerar consolidação em uma única migration de "estado final" para novos clones do banco, mantendo as históricas para upgrades incrementais.

**Prioridade:** Baixa.

---

## 6. Scripts locais não versionados

159 scripts em `scripts/` estão no `.gitignore` (testar-, verificar-, corrigir-, limpar-, etc.). Funcionais para o usuário mas:

- Não estão versionados, podem se perder em troca de máquina
- Não há documentação centralizada do que cada um faz
- Não há testes

**Sugestão futura:** documentar os mais úteis e movê-los para `scripts/local/` (já criada na Fase 1).

---

## 7. Padrões de código não totalmente uniformes

- Algumas rotas API ainda misturam lógica de negócio com query SQL — extrair para services
- Alguns componentes têm props excessivas — considerar composição
- Alguns hooks fazem múltiplas responsabilidades — separar

**Prioridade:** Média. Refatorar incrementalmente.

---

## Como atualizar este arquivo

Quando uma dívida for resolvida:
1. Marque o item com ✅ e a data
2. Mantenha o histórico para rastreabilidade
3. Atualize a data da última revisão no topo

Quando descobrir nova dívida:
1. Adicione na seção apropriada
2. Inclua justificativa e prioridade
3. Estime esforço se possível
