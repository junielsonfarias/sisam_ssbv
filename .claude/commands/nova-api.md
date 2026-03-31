Crie um novo endpoint de API seguindo o padrao do projeto SISAM.

Entrada: $ARGUMENTS (formato: "METODO /api/caminho descricao [tipos_permitidos]")
Exemplo: "GET POST PUT DELETE /api/admin/eventos CRUD de eventos [administrador,tecnico,editor]"

## Template Completo

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// Schema Zod para validacao de entrada
const recursoSchema = z.object({
  titulo: z.string().min(1, 'Titulo obrigatorio').max(255),
  descricao: z.string().max(5000).nullable().optional(),
  // Adaptar campos conforme necessidade
})

const recursoUpdateSchema = recursoSchema.partial().extend({
  id: z.string().uuid('ID invalido'),
})

/**
 * GET /api/admin/[recurso] — listar com filtros e paginacao
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1'))
    const limite = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50')))
    const busca = searchParams.get('busca')?.trim()

    let sql = `SELECT r.*, u.nome as criado_por_nome
               FROM recursos r
               LEFT JOIN usuarios u ON r.criado_por = u.id
               WHERE r.ativo = true`
    const params: (string | number)[] = []

    if (busca) {
      params.push(`%${busca}%`)
      sql += ` AND r.titulo ILIKE $${params.length}`
    }

    // Contar total (para paginacao)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM recursos r WHERE r.ativo = true${busca ? ` AND r.titulo ILIKE $1` : ''}`,
      busca ? [`%${busca}%`] : []
    )
    const total = parseInt(countResult.rows[0].count)

    sql += ` ORDER BY r.criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limite, (pagina - 1) * limite)

    const result = await pool.query(sql, params)

    return NextResponse.json({
      dados: result.rows,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNDEFINED_TABLE) {
      return NextResponse.json({ dados: [], total: 0 })
    }
    console.error('Erro ao listar:', (error as Error)?.message)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/admin/[recurso] — criar novo
 */
export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = recursoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        mensagem: 'Dados invalidos',
        erros: parsed.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
      }, { status: 400 })
    }

    const { titulo, descricao } = parsed.data

    const result = await pool.query(
      `INSERT INTO recursos (titulo, descricao, criado_por)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [titulo, descricao || null, usuario.id]
    )

    await cacheDelPattern('recursos:*')

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Registro ja existe' }, { status: 400 })
    }
    console.error('Erro ao criar:', (error as Error)?.message)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PUT /api/admin/[recurso] — atualizar existente
 */
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = recursoUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }

    const { id, ...dados } = parsed.data

    const result = await pool.query(
      `UPDATE recursos SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao),
       atualizado_em = CURRENT_TIMESTAMP WHERE id = $3 AND ativo = true RETURNING *`,
      [dados.titulo, dados.descricao, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Nao encontrado' }, { status: 404 })
    }

    await cacheDelPattern('recursos:*')

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro ao atualizar:', (error as Error)?.message)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * DELETE /api/admin/[recurso] — soft delete
 */
export const DELETE = withAuth(['administrador'], async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'ID obrigatorio' }, { status: 400 })
    }

    await pool.query(
      'UPDATE recursos SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )

    await cacheDelPattern('recursos:*')

    return NextResponse.json({ mensagem: 'Removido com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao remover:', (error as Error)?.message)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
```

## Checklist
- [ ] `export const dynamic = 'force-dynamic'` presente
- [ ] Todos os handlers usam `withAuth(tipos, handler)`
- [ ] Queries parametrizadas ($1, $2) — NUNCA interpolacao
- [ ] Erros retornam `{ mensagem }` com status correto
- [ ] POST retorna `{ status: 201 }`
- [ ] UNIQUE_VIOLATION tratado onde relevante
- [ ] Cache invalidado apos mutacoes
- [ ] JSDoc antes de cada handler
- [ ] `npx tsc --noEmit` sem erros
- [ ] Se recurso novo: perguntar sobre migracao SQL
