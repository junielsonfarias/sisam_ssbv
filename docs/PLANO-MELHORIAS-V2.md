# Plano de Melhorias — Educatec v2

**Data:** 2026-03-24
**Status atual:** 9.1/10
**Meta:** 9.8/10

---

## Fase 1 — Validação e Segurança (1-2 dias)
**Impacto:** Segurança 9.5 → 10 | Integridade 9.5 → 10

### 1.1 Expandir validação Zod para 100% das rotas POST/PUT
**Prioridade:** ALTA | **Esforço:** 4h | **Impacto:** +0.3

Atualmente 53% das rotas POST/PUT usam Zod. As 27 restantes usam validação manual.

**Rotas pendentes:**
- `admin/modulos-tecnico/route.ts` PUT
- `admin/controle-vagas/route.ts` PUT
- `admin/horarios-aula/route.ts` POST (parcial — tem schema mas falta validar disciplinas)
- `admin/personalizacao/route.ts` PUT
- `admin/cartao-resposta/gerar/route.ts` POST
- `admin/importar/route.ts` POST
- `admin/importar-cadastros/route.ts` POST
- `admin/importar-resultados/route.ts` POST
- `admin/fechamento-ano/route.ts` POST
- `admin/recalcular-niveis/route.ts` POST
- `admin/anos-letivos/route.ts` POST/PUT
- `admin/escolas/[id]/regras-avaliacao/route.ts` POST (tem Zod mas sem validateRequest wrapper)
- `professor/frequencia-diaria/route.ts` POST
- `professor/frequencia-diaria/justificar/route.ts` POST
- `professor/frequencia-hora-aula/route.ts` POST
- `professor/sync/route.ts` POST
- `auth/cadastro-professor/route.ts` POST
- `editor/noticias/route.ts` PUT
- `facial/presencas/lote/route.ts` POST (tem schema mas parcial)
- E mais ~8 rotas menores

**Critério de aceite:** `grep -r "await request.json()" app/api/ | wc -l` deve retornar 0 sem validateRequest/safeParse correspondente.

---

### 1.2 Centralizar enums de domínio em schemas.ts
**Prioridade:** MÉDIA | **Esforço:** 2h | **Impacto:** +0.1

Criar e usar schemas Zod para todos os enums do sistema:

```typescript
// Já criados:
situacaoAlunoSchema, statusFilaSchema, metodoFrequenciaSchema, statusFrequenciaSchema

// Faltam criar:
tipoUsuarioUpdateSchema    // para edição de tipo
statusDispositivoSchema    // 'ativo' | 'inativo' | 'bloqueado'
tipoTransferenciaSchema    // 'dentro_municipio' | 'fora_municipio'
tipoVinculoSchema          // 'polivalente' | 'disciplina'
statusAnoLetivoSchema      // 'planejamento' | 'ativo' | 'finalizado'
```

Aplicar esses enums nas rotas que usam validação manual de strings.

---

## Fase 2 — Testes Automatizados (3-5 dias)
**Impacto:** Qualidade 8.5 → 9.5

### 2.1 Testes unitários dos services (dia 1-2)
**Prioridade:** ALTA | **Esforço:** 8h | **Impacto:** +0.5

Atualmente: 12 testes. Meta: 60+ testes.

**Services prioritários:**
```
lib/services/notas.ts
  - calcularNotaFinal (com pesos, sem pesos, nota 0, null, > max)
  - lancarNotas (batch INSERT, validação, erros)

lib/services/frequencia.ts
  - registrarFrequenciaDiaria (batch, data futura, duplicata)
  - lancarFaltas (alunos cursando vs transferido)
  - validarDataNaoFutura

lib/api-helpers.ts
  - createWhereBuilder + addCondition + addAccessControl
  - parsePaginacao (limites, defaults)
  - extrairDataHoraLocal (timezone Belém, meia-noite, UTC)

lib/gerar-codigo-aluno.ts
  - gerarCodigoAluno (sequência, advisory lock)

lib/database/with-transaction.ts
  - withTransaction (commit, rollback, retry deadlock)
```

### 2.2 Testes de integração das APIs (dia 3-4)
**Prioridade:** MÉDIA | **Esforço:** 8h | **Impacto:** +0.3

**Endpoints críticos:**
```
POST /api/admin/alunos (criar, validar turma/escola, código automático)
PUT  /api/admin/alunos (editar, preservar cpf/pcd)
POST /api/professor/notas (lançar, nota 0, recuperação, > max)
POST /api/admin/frequencia-diaria/lancar-faltas
POST /api/admin/alunos/[id]/situacao (transferência, escola_id)
GET  /api/boletim (cache hit/miss, rate limit)
POST /api/facial/presencas (timezone, consentimento)
```

### 2.3 Testes E2E com Playwright (dia 5)
**Prioridade:** BAIXA | **Esforço:** 4h | **Impacto:** +0.2

```
- Login → Dashboard → Lançar notas → Verificar boletim
- Criar aluno → Editar → Transferir → Verificar histórico
- Terminal facial → Registrar presença → Verificar frequência
```

---

## Fase 3 — Acessibilidade WCAG 2.1 AA (2-3 dias)
**Impacto:** Frontend 9.0 → 9.5

### 3.1 Focus trap em modais
**Prioridade:** ALTA | **Esforço:** 3h | **Impacto:** +0.15

Implementar em `components/ui/modal-base.tsx`:
- Focus trap (Tab não sai do modal)
- Focus restoration (volta para botão que abriu)
- Escape para fechar
- Aria-modal="true"

Afeta: modal-aluno, ModalCrudTurma, modais do gestor-escolar, e todos que usam modal-base.

### 3.2 Labels e aria-labels nos formulários
**Prioridade:** ALTA | **Esforço:** 4h | **Impacto:** +0.15

- Associar `<label htmlFor>` a todos os `<input>` e `<select>`
- Adicionar `aria-label` em botões de ícone (Edit, Trash, Search)
- Adicionar `aria-busy` em botões durante loading
- Adicionar `aria-live="polite"` no container de toast

### 3.3 Navegação por teclado
**Prioridade:** MÉDIA | **Esforço:** 3h | **Impacto:** +0.1

- Tabelas: navegação com setas
- Dropdown de filtros: Enter para aplicar
- Atalhos: Ctrl+S para salvar em formulários

### 3.4 Contraste e tamanhos
**Prioridade:** BAIXA | **Esforço:** 2h | **Impacto:** +0.05

- Verificar contraste mínimo 4.5:1 em texto
- Verificar targets de toque mínimo 44x44px em mobile
- Completar dark mode nos 24% de componentes restantes

---

## Fase 4 — Observabilidade (1-2 dias)
**Impacto:** Observabilidade 8.5 → 9.5

### 4.1 Expandir audit logging
**Prioridade:** ALTA | **Esforço:** 4h | **Impacto:** +0.3

Adicionar `[AUDIT]` logging em:
```
- Login/logout (sucesso e falha)
- Criação/edição/exclusão de usuários
- Transferência de alunos
- Alteração de situação (cursando → transferido)
- Edição de configuração de notas/séries
- Exclusão de dados sensíveis (facial, consentimento)
- Importação de dados (início, fim, resultado)
```

Formato padronizado:
```
[AUDIT] {ação} | {entidade}:{id} | por {usuario.email} ({tipo}) | {detalhes}
```

### 4.2 Dashboard de métricas
**Prioridade:** MÉDIA | **Esforço:** 6h | **Impacto:** +0.2

Criar página `/admin/monitoramento` com:
- Uptime e tempo de resposta médio
- Queries por minuto e tempo médio
- Pool stats (conexões ativas, fila, erros)
- Top 10 endpoints mais lentos
- Erros nas últimas 24h
- Dispositivos faciais online/offline

### 4.3 Alertas automáticos
**Prioridade:** BAIXA | **Esforço:** 3h | **Impacto:** +0.1

- Notificação quando pool > 80% de uso
- Notificação quando erros > 10/min
- Notificação quando dispositivo facial offline > 1h

---

## Fase 5 — Performance Avançada (2-3 dias)
**Impacto:** Performance 9.0 → 9.5

### 5.1 Expandir api-helpers para rotas restantes
**Prioridade:** MÉDIA | **Esforço:** 6h | **Impacto:** +0.15

Rotas candidatas (ainda com WHERE manual):
- `admin/comparativos/route.ts` (536 linhas, com cache complexo)
- `admin/dashboard-rapido/route.ts` (435 linhas, cache multi-layer)
- `admin/aluno-questoes/route.ts` (555 linhas)

### 5.2 Índices de banco para queries frequentes
**Prioridade:** ALTA | **Esforço:** 2h | **Impacto:** +0.15

```sql
-- Índice para filtro de série (evita REGEXP_REPLACE full scan)
CREATE INDEX idx_alunos_serie_numero ON alunos (
  REGEXP_REPLACE(serie, '[^0-9]', '', 'g')
) WHERE ativo = true;

-- Índice para presença (filtro frequente)
CREATE INDEX idx_rc_presenca ON resultados_consolidados(presenca)
  WHERE presenca IS NOT NULL;

-- Índice para situação
CREATE INDEX idx_alunos_situacao ON alunos(situacao)
  WHERE ativo = true;

-- Índice parcial para frequência diária
CREATE INDEX idx_fd_escola_data ON frequencia_diaria(escola_id, data)
  WHERE status = 'presente';
```

### 5.3 Cache em mais endpoints
**Prioridade:** BAIXA | **Esforço:** 4h | **Impacto:** +0.1

Candidatos:
- `/api/admin/estatisticas` (TTL 5min)
- `/api/admin/estatisticas-serie` (TTL 5min)
- `/api/admin/disciplinas-escolares` (TTL 60s — muda raramente)
- `/api/admin/periodos-letivos` (TTL 60s)
- `/api/admin/series-escolares` (TTL 60s)

---

## Fase 6 — Documentação (1-2 dias)
**Prioridade:** BAIXA

### 6.1 Documentação de API (OpenAPI/Swagger)
- Gerar spec OpenAPI para os 157 endpoints
- Documentar parâmetros, respostas e erros
- Disponibilizar em `/api/docs`

### 6.2 README técnico atualizado
- Arquitetura do sistema
- Como rodar localmente
- Variáveis de ambiente necessárias
- Guia de contribuição

---

## Cronograma Sugerido

| Fase | Dias | Prioridade | Impacto na nota |
|------|------|-----------|-----------------|
| 1. Validação e Segurança | 1-2 | ALTA | +0.4 |
| 2. Testes Automatizados | 3-5 | ALTA | +1.0 |
| 3. Acessibilidade | 2-3 | MÉDIA | +0.45 |
| 4. Observabilidade | 1-2 | MÉDIA | +0.6 |
| 5. Performance Avançada | 2-3 | BAIXA | +0.4 |
| 6. Documentação | 1-2 | BAIXA | — |
| **Total** | **10-17 dias** | | **9.1 → 9.8+** |

---

## Métricas de Acompanhamento

```
Segurança:     grep "validateRequest\|safeParse" app/api/ | wc -l  (meta: 57/57)
Testes:        npx vitest --reporter=verbose | wc -l               (meta: 60+)
Acessibilidade: npx axe-core --pages=10                           (meta: 0 critical)
Performance:    lighthouse --only-categories=performance           (meta: 90+)
Cobertura:      npx vitest --coverage                              (meta: 50%+)
```
