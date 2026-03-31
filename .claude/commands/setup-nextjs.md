Inicialize um projeto Next.js 14 completo com todas as dependencias e configuracoes do padrao SISAM.

Entrada: $ARGUMENTS (nome do projeto e descricao)
Exemplo: "meu-app Sistema de gestao para escola"

## 1. Criar projeto Next.js
```bash
npx create-next-app@14 [nome] --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

## 2. Instalar dependencias do padrao
```bash
npm install pg @types/pg bcryptjs @types/bcryptjs jsonwebtoken @types/jsonwebtoken zod lucide-react recharts date-fns clsx @upstash/redis
npm install -D vitest @vitest/coverage-v8 @playwright/test
```

## 3. Criar estrutura de pastas
```
app/
  api/
    auth/login/route.ts
    auth/logout/route.ts
    auth/verificar/route.ts
    health/route.ts
  login/page.tsx
  layout.tsx
  page.tsx
components/
  ui/loading-spinner.tsx
  ui/modal-base.tsx
  protected-route.tsx
  toast.tsx
  rodape.tsx
lib/
  auth.ts
  auth/with-auth.ts
  cache/redis.ts
  constants.ts
  logger.ts
  schemas.ts
  types.ts
  validation.ts
  api-helpers.ts
database/
  connection.ts
  migrations/
__tests__/
  unit/
  integration/api/
e2e/
public/
```

## 4. Configurar arquivos base
- `tsconfig.json` com strict, paths @/*, target ES2020
- `tailwind.config.ts` com darkMode: 'class', cores semanticas via CSS vars
- `.eslintrc.json` com next/core-web-vitals
- `vitest.config.ts` com alias @/ e coverage v8
- `playwright.config.ts` com chromium + mobile
- `.env.example` com DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, UPSTASH vars
- `.gitignore` completo (node_modules, .next, .env, *.log)
- `middleware.ts` com rate limiting, CSRF, CSP, security headers

## 5. Configurar layout raiz
- `app/layout.tsx` com ThemeProvider, ToastProvider, ErrorBoundary
- Metadata com titulo, descricao, icons
- Script de tema (evitar flash de tema incorreto)
- `app/globals.css` com CSS vars para light/dark mode

## 6. Criar CLAUDE.md do novo projeto
Com regras de idioma, commits, estilo, arquitetura baseadas no padrao SISAM.

## 7. Criar CI/CD
- `.github/workflows/ci.yml` com Node 20, tsc, lint, vitest, build
- Env vars dummy para CI

Apos criar tudo, rodar `npx tsc --noEmit` e `npm test` para validar.
