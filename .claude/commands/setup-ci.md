Configure GitHub Actions CI completo no padrao SISAM.

Entrada: $ARGUMENTS (tipo: "supabase" ou "prisma" ou "ambos")

## Criar `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  DB_HOST: ci-placeholder
  DB_NAME: ci-placeholder
  DB_USER: ci-placeholder
  DB_PASSWORD: ci-placeholder
  JWT_SECRET: ci-placeholder-chave-minimo-32-caracteres-segura
  NODE_ENV: development

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - name: Type check
      run: npx tsc --noEmit
    - name: Lint
      run: npx next lint --quiet --max-warnings 0 || echo "Lint warnings (non-blocking)"
    - name: Tests
      run: npm test
    - name: Build
      run: npm run build
      env:
        NODE_ENV: production
    - name: Verify build
      run: test -d ".next" || exit 1
```

## Configuracoes necessarias:
1. **Node 20** — Vitest 4.x requer Node 20.12+
2. **Env vars dummy** — next.config.js valida vars e bloqueia sem elas
3. **Lint non-blocking** — warnings nao quebram CI, lint roda separado
4. **next.config.js** — adicionar `eslint: { ignoreDuringBuilds: true }`
5. **`.eslintrc.json`** — criar com `{ "extends": "next/core-web-vitals" }`

## Se usar Prisma, adicionar step:
```yaml
    - name: Generate Prisma
      run: npx prisma generate
```

## Para E2E (opcional):
```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install chromium
    - run: npm run test:e2e
```
