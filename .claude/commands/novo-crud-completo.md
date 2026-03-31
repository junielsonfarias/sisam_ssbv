Crie um CRUD completo (API + pagina + service + testes) para um recurso.

Entrada: $ARGUMENTS (recurso, campos e tipos permitidos)
Exemplo: "evento titulo:string,descricao:text?,tipo:enum(reuniao,formatura,geral),data_inicio:date,publico:boolean [administrador,tecnico,editor]"

## 1. Schema Zod (`lib/schemas.ts` ou inline)
```typescript
const eventoSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().max(5000).nullable().optional(),
  tipo: z.enum(['reuniao', 'formatura', 'geral']).default('geral'),
  data_inicio: z.string().min(1),
  publico: z.boolean().default(true),
})
const eventoUpdateSchema = eventoSchema.partial().extend({ id: z.string().uuid() })
```

## 2. API Route (`app/api/admin/[recurso]/route.ts`)

### GET — Listar com filtros
```typescript
export const GET = withAuth(tipos, async (request) => {
  const { searchParams } = new URL(request.url)
  const filtro = searchParams.get('filtro')
  const pagina = parseInt(searchParams.get('pagina') || '1')
  const limite = Math.min(parseInt(searchParams.get('limite') || '50'), 200)

  let sql = 'SELECT r.*, u.nome as criado_por_nome FROM recursos r LEFT JOIN usuarios u ON r.criado_por = u.id WHERE r.ativo = true'
  const params: any[] = []
  if (filtro) { sql += ` AND r.tipo = $${params.length + 1}`; params.push(filtro) }
  sql += ` ORDER BY r.criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  params.push(limite, (pagina - 1) * limite)

  const [dados, total] = await Promise.all([
    pool.query(sql, params),
    pool.query('SELECT COUNT(*) FROM recursos WHERE ativo = true', []),
  ])
  return NextResponse.json({ dados: dados.rows, total: parseInt(total.rows[0].count) })
})
```

### POST — Criar
```typescript
export const POST = withAuth(tipos, async (request, usuario) => {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ mensagem: 'Dados invalidos', erros: parsed.error.errors }, { status: 400 })

  const result = await pool.query(
    'INSERT INTO recursos (titulo, descricao, tipo, criado_por) VALUES ($1, $2, $3, $4) RETURNING *',
    [parsed.data.titulo, parsed.data.descricao, parsed.data.tipo, usuario.id]
  )
  await cacheDelPattern('recursos:*')
  return NextResponse.json(result.rows[0], { status: 201 })
})
```

### PUT — Atualizar
```typescript
export const PUT = withAuth(tipos, async (request, usuario) => {
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })

  const result = await pool.query(
    'UPDATE recursos SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao), atualizado_em = NOW() WHERE id = $3 AND ativo = true RETURNING *',
    [parsed.data.titulo, parsed.data.descricao, parsed.data.id]
  )
  if (result.rows.length === 0) return NextResponse.json({ mensagem: 'Nao encontrado' }, { status: 404 })
  await cacheDelPattern('recursos:*')
  return NextResponse.json(result.rows[0])
})
```

### DELETE — Soft delete
```typescript
export const DELETE = withAuth(tipos, async (request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'ID obrigatorio' }, { status: 400 })

  await pool.query('UPDATE recursos SET ativo = false, atualizado_em = NOW() WHERE id = $1', [id])
  await cacheDelPattern('recursos:*')
  return NextResponse.json({ mensagem: 'Removido com sucesso' })
})
```

## 3. Pagina Admin
Seguir padrao `/nova-pagina` com:
- Header gradiente, tabela responsiva, modal criar/editar
- Busca, filtros, paginacao, toast feedback

## 4. Teste de Integracao
Seguir padrao `/novo-teste` com mocks de pool.query e cache.

## 5. Migration SQL
Seguir padrao `/nova-migracao` com tabela, indices, foreign keys.

## Checklist final:
- [ ] Migration SQL criada
- [ ] API route com GET/POST/PUT/DELETE
- [ ] Schema Zod validando entrada
- [ ] Pagina admin com CRUD visual
- [ ] Teste de integracao
- [ ] Cache invalidado apos mutacoes
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npx vitest run` todos passam
