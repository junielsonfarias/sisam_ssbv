Crie um novo endpoint de API seguindo o padrao do projeto SISAM.

Entrada: $ARGUMENTS (formato: "METODO /api/caminho descricao [tipos_permitidos]")
Exemplo: "GET POST /api/admin/meu-recurso CRUD de meu recurso [administrador,tecnico]"

Siga EXATAMENTE este padrao:

1. Criar arquivo em `app/api/[caminho]/route.ts`
2. Incluir:
   - `import { NextResponse } from 'next/server'`
   - `import { withAuth } from '@/lib/auth/with-auth'`
   - `import pool from '@/database/connection'`
   - `export const dynamic = 'force-dynamic'`
3. Para POST/PUT: criar schema Zod inline ou usar existente de `lib/schemas.ts`
4. Usar `withAuth(tipos, async (request, usuario) => { ... })`
5. Queries SEMPRE parametrizadas ($1, $2)
6. Erros retornam `{ mensagem: '...' }` com status adequado
7. POST retorna status 201
8. Tratar `PG_ERRORS.UNIQUE_VIOLATION` se relevante
9. Invalidar cache se for mutacao: `cacheDelPattern('chave:*')`
10. JSDoc comment antes de cada handler

Apos criar, rodar `npx tsc --noEmit` para verificar tipos.
Se for um recurso novo, perguntar se precisa de migracao SQL.
