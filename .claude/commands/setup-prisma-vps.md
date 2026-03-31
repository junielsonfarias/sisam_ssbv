Configure Prisma ORM com PostgreSQL para deploy em VPS (nao serverless).

Entrada: $ARGUMENTS (nome do banco e descricao ou "default")

## 1. Instalar Prisma
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

## 2. Configurar `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modelo base com campos padrao
model Usuario {
  id            String    @id @default(uuid()) @db.Uuid
  nome          String    @db.VarChar(255)
  email         String    @unique @db.VarChar(254)
  senha         String    @db.VarChar(255)
  tipo_usuario  String    @db.VarChar(50)
  polo_id       String?   @db.Uuid
  escola_id     String?   @db.Uuid
  ativo         Boolean   @default(true)
  criado_em     DateTime  @default(now())
  atualizado_em DateTime  @updatedAt

  polo   Polo?   @relation(fields: [polo_id], references: [id])
  escola Escola? @relation(fields: [escola_id], references: [id])

  @@map("usuarios")
}
```

## 3. Criar `lib/prisma.ts` (singleton)
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

## 4. Configurar `.env`
```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_banco?schema=public"
```

## 5. Criar API Route adaptada para Prisma
```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import prisma from '@/lib/prisma'

export const GET = withAuth(['administrador'], async (request, usuario) => {
  const dados = await prisma.recurso.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    take: 50,
  })
  return NextResponse.json({ dados })
})

export const POST = withAuth(['administrador'], async (request, usuario) => {
  const body = await request.json()
  // Validar com Zod antes
  const novo = await prisma.recurso.create({ data: { ...body } })
  return NextResponse.json(novo, { status: 201 })
})
```

## 6. Scripts uteis no package.json
```json
{
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:migrate:prod": "prisma migrate deploy",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset"
}
```

## 7. Seed com `prisma/seed.ts`
Criar usuario admin padrao com senha hash bcrypt.

## 8. Docker Compose (opcional para VPS)
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: nome_banco
      POSTGRES_USER: usuario
      POSTGRES_PASSWORD: senha
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

## Diferenças Supabase vs Prisma VPS:
| Aspecto | Supabase (pool.query) | Prisma VPS |
|---------|----------------------|------------|
| ORM | SQL raw parametrizado | Prisma Client tipado |
| Migrations | SQL files manuais | prisma migrate |
| Connection | Pool PG com retry | Prisma singleton |
| Deploy | Vercel serverless | VPS (PM2/Docker) |
| SSL | Obrigatorio | Opcional (local) |
| Pool | Manual (40 connections) | Automatico Prisma |
