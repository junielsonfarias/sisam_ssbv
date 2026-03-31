Crie um modulo completo no SISAM (migracao + API + pagina + testes).

Entrada: $ARGUMENTS (nome do modulo e descricao)
Exemplo: "lembretes Sistema de lembretes para escolas com titulo, descricao, data, prioridade"

Este comando cria o modulo completo em 5 etapas:

## Etapa 1: Migracao SQL
- Criar `database/migrations/add-[modulo].sql`
- Tabela com id UUID, campos do recurso, foreign keys, ativo, criado_em, atualizado_em
- Indices para campos de busca e foreign keys

## Etapa 2: Service Layer
- Criar `lib/services/[modulo].service.ts`
- Interfaces para DB rows e retorno publico
- Funcoes: listar, buscar por ID, criar, atualizar, excluir
- WHERE builder para filtros dinamicos

## Etapa 3: API Routes
- Criar `app/api/admin/[modulo]/route.ts` com:
  - GET: listar com filtros e paginacao
  - POST: criar com validacao Zod
  - PUT: atualizar com validacao Zod
  - DELETE: soft delete (ativo = false)
- Schema Zod para validacao
- withAuth com tipos adequados
- Cache invalidation apos mutacoes

## Etapa 4: Pagina Admin
- Criar `app/admin/[modulo]/page.tsx` com:
  - Header com gradiente e icone
  - Tabela responsiva (desktop + mobile cards)
  - Modal para criar/editar
  - Busca e filtros
  - Paginacao
  - Toast para feedback
  - ProtectedRoute

## Etapa 5: Testes
- Criar `__tests__/integration/api/[modulo].test.ts`
- Testar GET, POST, validacao, erros

## Apos criacao:
1. Rodar `npx tsc --noEmit` — 0 erros
2. Rodar `npx vitest run` — todos passam
3. Atualizar `docs/openapi.yaml` com novos endpoints
4. Atualizar menu do admin se necessario
