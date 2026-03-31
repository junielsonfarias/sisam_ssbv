Crie testes para um endpoint ou componente do SISAM.

Entrada: $ARGUMENTS (caminho do arquivo a testar)
Exemplo: "app/api/admin/eventos/route.ts" ou "lib/services/alunos.service.ts"

Siga EXATAMENTE este padrao:

1. Para testes de API (`__tests__/integration/api/[nome].test.ts`):
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest'

   vi.mock('@/database/connection', () => ({
     default: { query: vi.fn() },
   }))

   vi.mock('@/lib/cache', () => ({
     withRedisCache: vi.fn((_key, _ttl, fn) => fn()),
     cacheKey: vi.fn((...args) => args.join(':')),
     cacheDelPattern: vi.fn(),
   }))
   ```
   - Mockar `pool.query` com dados realistas
   - Testar: status 200/201/400/401/404/500
   - Testar: campos esperados na resposta
   - Testar: validacao (body invalido)
   - Testar: tabela inexistente (PG_ERRORS.UNDEFINED_TABLE)

2. Para testes unitarios (`__tests__/unit/[nome].test.ts`):
   - Testar funcoes puras sem mocks quando possivel
   - Mockar apenas dependencias externas

3. Para testes E2E (`e2e/[nome].spec.ts`):
   ```typescript
   import { test, expect } from '@playwright/test'
   ```
   - Testar fluxo do usuario (navegar, preencher, clicar, verificar)
   - Usar `await expect(page.locator(...)).toBeVisible()`
   - Timeout de 10000ms para elementos que dependem de API

4. Rodar `npx vitest run` para verificar se todos passam apos criar.
