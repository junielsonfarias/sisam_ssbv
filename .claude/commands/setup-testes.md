Configure suite de testes completa: Vitest (unitarios/integracao) + Playwright (E2E).

Entrada: $ARGUMENTS ("vitest" ou "playwright" ou "completo")

## 1. Vitest — Testes unitarios e integracao

### Instalar
```bash
npm install -D vitest @vitest/coverage-v8
```

### Criar `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/services/**', 'lib/api-helpers.ts', 'lib/auth/**'],
      reporter: ['text', 'text-summary'],
    },
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

### Estrutura de pastas
```
__tests__/
  helpers/          — factories, mocks reutilizaveis
  unit/             — testes de funcoes puras
  integration/
    api/            — testes de API routes com mocks
```

### Template de teste de API
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

import { GET, POST } from '@/app/api/admin/recurso/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string, opts?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), opts)
}

describe('GET /api/admin/recurso', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 200 com dados', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: '1', nome: 'Teste' }], rowCount: 1 } as any)
    const res = await GET(createRequest('http://localhost:3000/api/admin/recurso'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dados).toBeDefined()
  })
})
```

### Scripts no package.json
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## 2. Playwright — Testes E2E

### Instalar
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Criar `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Template de teste E2E
```typescript
import { test, expect } from '@playwright/test'

test.describe('Pagina Publica', () => {
  test('carrega homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toBeVisible()
  })

  test('login com credenciais invalidas mostra erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalido@test.com')
    await page.fill('input[type="password"]', 'senhaerrada123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/erro|invalid/i')).toBeVisible({ timeout: 5000 })
  })

  test('responsividade mobile sem scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientW = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollW).toBeLessThanOrEqual(clientW + 5)
  })
})
```

### Scripts no package.json
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

### Adicionar ao .gitignore
```
test-results/
playwright-report/
```
