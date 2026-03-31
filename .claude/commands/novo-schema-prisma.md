Crie um schema Prisma completo para PostgreSQL em VPS.

Entrada: $ARGUMENTS (modelo e campos)
Exemplo: "Evento titulo:String,descricao:String?,tipo:EventoTipo,dataInicio:DateTime,publico:Boolean,escola:Escola?"

## Padrao de modelo Prisma
```prisma
// prisma/schema.prisma

enum EventoTipo {
  REUNIAO
  FORMATURA
  JOGOS
  CAPACITACAO
  GERAL
}

model Evento {
  id          String      @id @default(uuid()) @db.Uuid
  titulo      String      @db.VarChar(255)
  descricao   String?     @db.Text
  tipo        EventoTipo  @default(GERAL)
  dataInicio  DateTime    @map("data_inicio")
  dataFim     DateTime?   @map("data_fim")
  local       String?     @db.VarChar(255)
  publico     Boolean     @default(true)

  // Relacoes
  escolaId    String?     @map("escola_id") @db.Uuid
  escola      Escola?     @relation(fields: [escolaId], references: [id], onDelete: SetNull)
  criadoPor   String?     @map("criado_por") @db.Uuid
  criador     Usuario?    @relation(fields: [criadoPor], references: [id], onDelete: SetNull)

  // Metadados
  ativo       Boolean     @default(true)
  criadoEm    DateTime    @default(now()) @map("criado_em")
  atualizadoEm DateTime  @updatedAt @map("atualizado_em")

  // Indices
  @@index([dataInicio(sort: Desc)])
  @@index([escolaId])
  @@index([tipo])
  @@map("eventos")
}
```

## Convencoes Prisma
- Model: PascalCase singular (Evento, Usuario, Escola)
- Campos: camelCase (dataInicio, criadoPor)
- Tabela: snake_case plural via `@@map("eventos")`
- Colunas: snake_case via `@map("data_inicio")`
- IDs: UUID com `@default(uuid())` e `@db.Uuid`
- Soft delete: `ativo Boolean @default(true)`
- Timestamps: `criadoEm @default(now())`, `atualizadoEm @updatedAt`
- Enums: PascalCase com valores UPPER_CASE

## Relacoes comuns
```prisma
// 1:N — Escola tem muitos Alunos
model Escola {
  id      String   @id @default(uuid()) @db.Uuid
  alunos  Aluno[]
  @@map("escolas")
}

model Aluno {
  id        String  @id @default(uuid()) @db.Uuid
  escolaId  String  @map("escola_id") @db.Uuid
  escola    Escola  @relation(fields: [escolaId], references: [id], onDelete: Cascade)
  @@map("alunos")
}

// N:M — Turma tem muitas Disciplinas
model Turma {
  id          String              @id @default(uuid()) @db.Uuid
  disciplinas TurmaDisciplina[]
  @@map("turmas")
}

model TurmaDisciplina {
  turmaId       String     @map("turma_id") @db.Uuid
  disciplinaId  String     @map("disciplina_id") @db.Uuid
  turma         Turma      @relation(fields: [turmaId], references: [id], onDelete: Cascade)
  disciplina    Disciplina @relation(fields: [disciplinaId], references: [id], onDelete: Cascade)
  @@id([turmaId, disciplinaId])
  @@map("turma_disciplinas")
}
```

## Queries Prisma equivalentes ao pool.query
```typescript
// Listar com filtros
const eventos = await prisma.evento.findMany({
  where: { ativo: true, tipo: 'REUNIAO', escolaId: escolaId || undefined },
  orderBy: { dataInicio: 'desc' },
  take: 50,
  skip: (pagina - 1) * 50,
  include: { escola: { select: { nome: true } }, criador: { select: { nome: true } } },
})

// Criar
const novo = await prisma.evento.create({
  data: { titulo, descricao, tipo: 'GERAL', dataInicio: new Date(dataInicio), criadoPor: usuario.id },
})

// Atualizar
const atualizado = await prisma.evento.update({
  where: { id },
  data: { titulo, descricao },
})

// Soft delete
await prisma.evento.update({ where: { id }, data: { ativo: false } })

// Contar
const total = await prisma.evento.count({ where: { ativo: true } })
```

## Comandos
```bash
npx prisma migrate dev --name add-eventos    # Criar migracao
npx prisma generate                           # Gerar client
npx prisma db push                            # Sync direto (dev)
npx prisma studio                             # GUI visual
```
